// App.tsx (完全版)

import React, { useState, useEffect, useCallback } from 'react';

// firebase と auth 関連
import { auth, db } from '@/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';

// コンポーネント関連
import Dashboard from '@/components/Dashboard';
import { ProjectSelection } from '@/components/ProjectSelection';
import LoadingOverlay from '@/components/LoadingOverlay';

// サービス関連
import { generateTasksWithGemini, regenerateTasks, getChatCompletion } from '@/services/geminiService';
import { 
  saveProject, 
  updateProject, 
  getProject, 
  deleteProject, 
  saveTask, 
  updateTask, 
  deleteTask, 
  getTasksForProject, 
  getProjectsForUser, 
  updateProjectVisibility // ★ インポート
} from '@/services/firestoreService';

// 型定義とユーティリティ
import type { Project, Task, TaskStatus, ChatMessage, GroundingChunk, TaskSuggestion, ProjectVisibility } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegeneratingTasks, setIsRegeneratingTasks] = useState(false);
  const [isApiKeyAvailable, setIsApiKeyAvailable] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ taskId: string; taskName: string } | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatAvailable, setIsChatAvailable] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('認証情報を確認中...');

  const fetchProjects = useCallback(async (userId: string) => {
    setLoadingMessage('プロジェクトを読み込んでいます...');
    setIsLoading(true);
    setError(null);
    try {
      const userProjects = await getProjectsForUser(userId);
      setProjects(userProjects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError("プロジェクトの読み込み中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
      setError("ログインに失敗しました。");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
      setError("ログアウトに失敗しました。");
    }
  };

  const handleGenerateTasks = useCallback(async (project: Project, urls: string[]): Promise<Project | null> => {
    if (!isApiKeyAvailable) throw new Error("APIキーが設定されていません。");
    try {
      const combinedContent = `${project.overview}\n\n備考: ${project.additionalNotes || ''}`;
      const generatedTasksResponse = await generateTasksWithGemini(project.overview, project.startDate, project.dueDate, combinedContent);
      if (!generatedTasksResponse.candidates?.length) throw new Error("APIから有効な応答候補が返されませんでした。");
      const firstCandidate = generatedTasksResponse.candidates[0];
      if (!firstCandidate.content?.parts?.length) throw new Error("APIの応答内容が空です。");
      let geminiResponseText = firstCandidate.content.parts[0].text;
      if (!geminiResponseText) throw new Error("AIからテキストが抽出できませんでした。");
      if (geminiResponseText.startsWith("```json")) geminiResponseText = geminiResponseText.slice(7, -3).trim();
      else if (geminiResponseText.startsWith("```")) geminiResponseText = geminiResponseText.slice(3, -3).trim();
      const generatedTasks: Task[] = JSON.parse(geminiResponseText);
      if (!Array.isArray(generatedTasks)) throw new Error("AIの応答がJSON配列ではありませんでした。");
      const tasksWithIds: Task[] = generatedTasks.map(task => ({ ...task, id: uuidv4(), code: `P${project.id.substring(0, 4)}-T${uuidv4().substring(0, 4)}`, status: '未着手' }));
      return { ...project, tasks: tasksWithIds };
    } catch (err) {
      throw err;
    }
  }, [isApiKeyAvailable]);

  const handleStartProjectCreation = useCallback(async (details: {
    projectName: string;
    projectOverview: string;
    startDate: string;
    dueDate: string;
    additionalNotes: string;
  }) => {
    if (!user) return;

    setIsLoading(true);
    setLoadingMessage("プロジェクトを作成しています...");
    setError(null);

    try {
      const newProject: Project = {
        id: uuidv4(),
        name: details.projectName,
        overview: details.projectOverview,
        purpose: '',
        acceptanceCriteria: '',
        startDate: details.startDate,
        dueDate: details.dueDate,
        tasks: [],
        ownerId: user.uid,
        visibility: 'private', // デフォルトは非公開
        additionalNotes: details.additionalNotes,
      };

      setLoadingMessage("AIがタスクを生成しています...");
      const projectWithTasks = await handleGenerateTasks(newProject, []);

      if (projectWithTasks) {
        setLoadingMessage("データベースに保存しています...");

        const { tasks, ...projectData } = projectWithTasks;
        await saveProject(projectData, user.uid);
        if (tasks && tasks.length > 0) {
          for (const task of tasks) {
            await saveTask(projectData.id, task);
          }
        }

        setProjects(prev => [...prev, projectWithTasks]);
        setSelectedProject(projectWithTasks);
      } else {
        throw new Error("タスクの生成に失敗しました。");
      }

    } catch (err) {
      console.error("❌ プロジェクト作成エラー:", err);
      const errorMessage = err instanceof Error ? err.message : "不明なエラーが発生しました。";
      setError(`エラーが発生しました: ${errorMessage}`);
      setSelectedProject(null);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [user, handleGenerateTasks]);

  const handleSelectProject = useCallback(async (project: Project) => {
    if (!user) return;
    setLoadingMessage('プロジェクト詳細を読み込んでいます...');
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProject = await getProject(project.id);
      if (fetchedProject) {
        const tasks = await getTasksForProject(project.id);
        setSelectedProject({ ...fetchedProject, tasks });
        setChatHistory([]);
        setGroundingChunks([]);
      } else {
        setError("選択されたプロジェクトが見つかりませんでした。");
      }
    } catch (err) {
      console.error("Error selecting project:", err);
      setError("プロジェクトの選択中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [user]);

  // ★ 追加: 公開設定を変更するハンドラ
  const handleVisibilityChange = useCallback(async (newVisibility: ProjectVisibility) => {
    if (!selectedProject || !user || selectedProject.ownerId !== user.uid) return;

    try {
      await updateProjectVisibility(selectedProject.id, newVisibility);
      const updatedProject = { ...selectedProject, visibility: newVisibility };
      setSelectedProject(updatedProject);
      // プロジェクト一覧のStateも更新
      setProjects(prevProjects => 
        prevProjects.map(p => p.id === selectedProject.id ? updatedProject : p)
      );
    } catch (err) {
      console.error("Error updating project visibility:", err);
      setError("公開設定の変更中にエラーが発生しました。");
    }
  }, [selectedProject, user]);

  const handleUpdateProjectMeta = useCallback(async (updatedMeta: Partial<Pick<Project, 'overview' | 'purpose' | 'acceptanceCriteria'>>) => {
    if (!selectedProject || !user) return;
    // 権限チェック
    const isEditable = selectedProject.ownerId === user.uid || selectedProject.visibility === 'public_edit';
    if (!isEditable) {
      setError("このプロジェクトを編集する権限がありません。");
      return;
    }
    setIsLoading(true);
    try {
      const projectToUpdate = { id: selectedProject.id, ...updatedMeta };
      await updateProject(projectToUpdate);
      const updatedProject = { ...selectedProject, ...updatedMeta };
      setSelectedProject(updatedProject);
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    } catch (err) {
      console.error("Error updating project metadata:", err);
      setError("プロジェクト情報の更新中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, user]);
  
  const handleRegenerateTasks = useCallback(async () => {
    if (!selectedProject || !isApiKeyAvailable) return;
    const isEditable = selectedProject.ownerId === user.uid || selectedProject.visibility === 'public_edit';
    if (!isEditable) {
      setError("タスクを再生成する権限がありません。");
      return;
    }
    setIsRegeneratingTasks(true);
    try {
      const regeneratedTasks = await handleGenerateTasks(selectedProject, []);
      if (regeneratedTasks) {
        await Promise.all(selectedProject.tasks.map(task => deleteTask(selectedProject.id, task.id)));
        await Promise.all(regeneratedTasks.tasks.map(task => saveTask(selectedProject.id, task)));
        const updatedProject = { ...selectedProject, tasks: regeneratedTasks.tasks };
        await updateProject({ id: updatedProject.id, tasks: updatedProject.tasks });
        setSelectedProject(updatedProject);
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      }
    } catch (err) {
      console.error("Error regenerating tasks:", err);
      setError("タスクの再生成中にエラーが発生しました。");
    } finally {
      setIsRegeneratingTasks(false);
    }
  }, [selectedProject, user, isApiKeyAvailable, handleGenerateTasks]);

  // (他のハンドラ関数は変更なし)
  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (!selectedProject || !user) return;
    const taskToUpdate = selectedProject.tasks.find(task => task.id === taskId);
    if (taskToUpdate) {
      const updatedTask = { ...taskToUpdate, status: newStatus, updatedAt: new Date().toISOString() };
      await updateTask(selectedProject.id, updatedTask);
      const updatedTasks = selectedProject.tasks.map(task => task.id === taskId ? updatedTask : task);
      setSelectedProject(prev => prev ? { ...prev, tasks: updatedTasks } : null);
    }
  }, [selectedProject, user]);

  const handleTaskUpdate = useCallback(async (updatedTask: Task) => {
    if (!selectedProject || !user) return;
    await updateTask(selectedProject.id, updatedTask);
    const updatedTasks = selectedProject.tasks.map(task => task.id === updatedTask.id ? updatedTask : task);
    setSelectedProject(prev => prev ? { ...prev, tasks: updatedTasks } : null);
  }, [selectedProject, user]);

  const handleAddTask = useCallback(async (newTaskData: Omit<Task, 'id' | 'status'>) => {
    if (!selectedProject || !user) return;
    const newTask: Task = { ...newTaskData, id: uuidv4(), status: '未着手' };
    await saveTask(selectedProject.id, newTask);
    const updatedTasks = [...selectedProject.tasks, newTask];
    setSelectedProject(prev => prev ? { ...prev, tasks: updatedTasks } : null);
  }, [selectedProject, user]);

  const handleRequestTaskDelete = useCallback((taskId: string, taskName: string) => {
    setTaskToDelete({ taskId, taskName });
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDeleteTask = useCallback(async () => {
    if (!selectedProject || !user || !taskToDelete) return;
    await deleteTask(selectedProject.id, taskToDelete.taskId);
    const updatedTasks = selectedProject.tasks.filter(task => task.id !== taskToDelete.taskId);
    setSelectedProject(prev => prev ? { ...prev, tasks: updatedTasks } : null);
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  }, [selectedProject, user, taskToDelete]);

  const handleCancelDeleteTask = useCallback(() => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  }, []);

  const handleResetProject = useCallback(() => {
    setSelectedProject(null);
    // プロジェクト一覧に戻るときにリストを再読み込みする
    if (user) {
      fetchProjects(user.uid);
    }
  }, [user, fetchProjects]);

  const handleProjectDeleted = useCallback(async () => {
    if (user) await fetchProjects(user.uid);
    setSelectedProject(null);
  }, [user, fetchProjects]);

  const handleTaskDatesChange = useCallback(async (taskId: string, newStartDate: string, newDueDate: string) => {
    if (!selectedProject || !user) return;
    const taskToUpdate = selectedProject.tasks.find(task => task.id === taskId);
    if (taskToUpdate) {
      const updatedTask = { ...taskToUpdate, startDate: newStartDate, dueDate: newDueDate };
      await updateTask(selectedProject.id, updatedTask);
      const updatedTasks = selectedProject.tasks.map(task => task.id === taskId ? updatedTask : task);
      setSelectedProject(prev => prev ? { ...prev, tasks: updatedTasks } : null);
    }
  }, [selectedProject, user]);

  const handleSendChatMessage = useCallback(async (message: string) => {
    if (!selectedProject || !isChatAvailable) {
      setError("チャット機能は利用できません。");
      return;
    }
    const newChatHistory: ChatMessage[] = [
      ...chatHistory,
      { id: uuidv4(), sender: 'user', parts: [{ text: message }], timestamp: new Date() }
    ];
    setChatHistory(newChatHistory);
    setIsChatLoading(true);
    setError(null);
    try {
      const responseText = await getChatCompletion(selectedProject.overview, newChatHistory);
      const updatedChatHistory: ChatMessage[] = [
        ...newChatHistory,
        { id: uuidv4(), sender: 'ai', parts: [{ text: responseText }], timestamp: new Date() }
      ];
      setChatHistory(updatedChatHistory);
    } catch (err) {
      console.error("Error sending chat message:", err);
      const errorHistory: ChatMessage[] = [
        ...newChatHistory,
        { id: uuidv4(), sender: 'ai', parts: [{ text: '申し訳ありません、エラーが発生しました。' }], timestamp: new Date() }
      ];
      setChatHistory(errorHistory);
      setError("チャットメッセージの送信中にエラーが発生しました。");
    } finally {
      setIsChatLoading(false);
    }
  }, [selectedProject, chatHistory, isChatAvailable]);


 console.log('VITE_API_KEY:', import.meta.env.VITE_API_KEY);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      setLoadingMessage('認証情報を確認中...');
      if (currentUser) {
        setUser(currentUser);
        setIsApiKeyAvailable(!!import.meta.env.VITE_GEMINI_API_KEY);
        setIsChatAvailable(!!import.meta.env.VITE_GEMINI_API_KEY);
        await fetchProjects(currentUser.uid);
      } else {
        setUser(null);
        setSelectedProject(null);
        setProjects([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchProjects]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => { setError(null); setIsLoading(false); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">プロジェクト管理ダッシュボード</h1>
          <p className="text-gray-600 mb-6">Googleアカウントでログインして開始してください。</p>
          <button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">プロジェクト管理</h1>
          <div className="flex items-center space-x-3">
            <span className="text-gray-700 text-sm sm:text-base hidden sm:inline">ようこそ、{user.displayName}さん！</span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-1.5 px-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              ログアウト
            </button>
          </div>
        </header>

        {selectedProject ? (
          <Dashboard
            project={selectedProject}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskUpdate={handleTaskUpdate}
            onAddTask={handleAddTask}
            onRequestTaskDelete={handleRequestTaskDelete}
            onResetProject={handleResetProject}
            onProjectMetaUpdate={handleUpdateProjectMeta}
            onTaskDatesChange={handleTaskDatesChange}
            onVisibilityChange={handleVisibilityChange} // ★ 追加
            onRequestTaskRegenerate={handleRegenerateTasks}
            isLoading={false}
            isRegeneratingTasks={isRegeneratingTasks}
            isApiKeyAvailable={isApiKeyAvailable}
            groundingChunks={groundingChunks}
            chatHistory={chatHistory}
            onSendChatMessage={handleSendChatMessage}
            isChatLoading={isChatLoading}
            isChatAvailable={isChatAvailable}
            currentUserId={user.uid}
          />
        ) : (
          <ProjectSelection
            projects={projects}
            onSelectProject={handleSelectProject}
            onStartProjectCreation={handleStartProjectCreation}
            isApiKeyAvailable={isApiKeyAvailable}
            onProjectDeleted={handleProjectDeleted}
            isCreating={isLoading}
          />
        )}
      </div>
    </>
  );
};

export default App;