// App.tsx (完全版)

// App.tsx のインポート部分（統一された正しい書き方）

import React, { useState, useEffect, useCallback } from 'react';

// firebase.ts は src の直下にあるので、パスは '@/firebase'
import { auth, db } from '@/firebase'; 
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';

// components フォルダは src の中にあるので、パスは '@/components/...'
import Dashboard from '@/components/Dashboard';
import { ProjectSelection } from '@/components/ProjectSelection';
import LoadingOverlay from '@/components/LoadingOverlay';

// services フォルダも src の中にあるので、パスは '@/services/...'
import { generateTasksWithGemini, regenerateTasks, getChatCompletion } from '@/services/geminiService';
import { saveProject, updateProject, getProject, deleteProject, saveTask, updateTask, deleteTask, getTasksForProject, getProjectsForUser } from '@/services/firestoreService';

// types.ts も src の中にあるので、パスは '@/types'
import type { Project, Task, TaskStatus, ChatMessage, GroundingChunk, TaskSuggestion } from '@/types';
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
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsApiKeyAvailable(!!import.meta.env.VITE_GEMINI_API_KEY);
        setIsChatAvailable(!!import.meta.env.VITE_GEMINI_API_KEY);
        await fetchProjects(currentUser.uid);
      } else {
        setUser(null);
        setSelectedProject(null);
        setProjects([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchProjects = useCallback(async (userId: string) => {
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

    const handleCreateProject = async (projectName: string, projectOverview: string, projectPurpose: string, acceptanceCriteria: string, startDate: string, dueDate: string) => {
    if (!user) return;

    // ★ 1. ローディングを開始し、最初のメッセージを設定
    setIsLoading(true);
    setError(null);

    // ★ 2. 表示するメッセージのリストを定義
    const messages = [
      "プロジェクトの初期設定を行っています...",
      "ユーザー様のプロジェクト概要を確認中...",
      "AIがプロジェクト内容を精査しています...",
      "関連するタスクを洗い出しています...",
      "タスクリストを生成しています...",
      "最終処理中です。もう少々お待ちください...",
    ];

    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
      // ★ 3. ダミーの進捗を順番に表示
      for (const msg of messages) {
        setLoadingMessage(msg);
        await sleep(800); // 0.8秒ごとにメッセージを更新
      }
      
      // ★ 4. 本当のAI呼び出しとDB保存処理
      const newProject: Project = {
        id: uuidv4(),
        name: projectName,
        overview: projectOverview,
        purpose: projectPurpose,
        acceptanceCriteria: acceptanceCriteria,
        startDate: startDate,
        dueDate: dueDate,
        tasks: [],
        ownerId: user.uid,
      };

      const projectWithTasks = await handleGenerateTasks(newProject, []);

      if (projectWithTasks) {
        setLoadingMessage("データベースに保存しています...");
        await saveProject(projectWithTasks, user.uid);
        await sleep(500); // 保存メッセージを少し見せる

        setProjects(prev => [...prev, projectWithTasks]);
        setSelectedProject(projectWithTasks);
      }
      
    } catch (err) {
      console.error("❌ プロジェクト作成またはタスク生成プロセスでエラーが発生しました:", err);
      if (err instanceof Error) {
        setError(`エラーが発生しました: ${err.message}`);
      } else {
        setError("不明なエラーが発生しました。");
      }
    } finally {
      // ★ 5. 全てが終わったらローディングを解除
      setIsLoading(false);
    }
  };

  const handleSelectProject = useCallback(async (project: Project) => {
    if (!user) return;
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
    }
  }, [user]);

  // App.tsx の handleGenerateTasks 関数をこの内容に置き換えてください

// App.tsx の handleGenerateTasks 関数をこの最終版に置き換えてください

// App.tsx の handleGenerateTasks 関数（最終完成版）

// App.tsx の handleGenerateTasks 関数（真の最終完成版）
const handleGenerateTasks = useCallback(async (project: Project, urls: string[]): Promise<Project | null> => { // 戻り値をProject | nullにする
    if (!isApiKeyAvailable) {
      throw new Error("APIキーが設定されていません。");
    }
    
    // この関数はもうUIのローディング表示を直接操作しない
    
    try {
      let combinedContent = project.overview;

      const generatedTasksResponse = await generateTasksWithGemini(
          project.overview,
          project.startDate,
          project.dueDate,
          combinedContent
      );

      if (!generatedTasksResponse.candidates || generatedTasksResponse.candidates.length === 0) {
        throw new Error("APIから有効な応答候補が返されませんでした。");
      }
      
      const firstCandidate = generatedTasksResponse.candidates[0];

      if (!firstCandidate.content || !firstCandidate.content.parts || firstCandidate.content.parts.length === 0) {
          throw new Error("APIの応答内容が空です。");
      }

      let geminiResponseText = firstCandidate.content.parts[0].text;
      
      if (geminiResponseText.startsWith("```json")) {
        geminiResponseText = geminiResponseText.slice(7, -3).trim();
      } else if (geminiResponseText.startsWith("```")) {
        geminiResponseText = geminiResponseText.slice(3, -3).trim();
      }
      
      const generatedTasks: Task[] = JSON.parse(geminiResponseText);

      const tasksWithIds: Task[] = generatedTasks.map(task => ({
        ...task,
        id: uuidv4(),
        code: `P${project.id.substring(0, 4)}-T${uuidv4().substring(0, 4)}`,
        status: '未着手',
      }));

      // 生成したタスクをプロジェクトオブジェクトに合体させて返す
      return { ...project, tasks: tasksWithIds };

    } catch (err) {
      // エラーが発生したら、呼び出し元にnullを返して失敗を知らせる
      console.error("❌ タスク生成中にエラーが発生しました:", err);
      // エラーを再スローして、呼び出し元のcatchブロックで処理させる
      throw err;
    }
}, [isApiKeyAvailable]);


  // (他のハンドラ関数はここにそのままペーストしてください)
  const handleUpdateProjectMeta = useCallback(async (updatedMeta: Partial<Pick<Project, 'overview' | 'purpose' | 'acceptanceCriteria'>>) => { /* ... */ }, []);
  const handleRegenerateTasks = useCallback(async () => { /* ... */ }, []);
  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => { /* ... */ }, []);
  const handleTaskUpdate = useCallback(async (updatedTask: Task) => { /* ... */ }, []);
  const handleAddTask = useCallback(async (newTaskData: any) => { /* ... */ }, []);
  const handleRequestTaskDelete = useCallback((taskId: string, taskName: string) => { /* ... */ }, []);
  const handleConfirmDeleteTask = useCallback(async () => { /* ... */ }, []);
  const handleCancelDeleteTask = useCallback(() => { /* ... */ }, []);
  const handleResetProject = useCallback(() => { setSelectedProject(null); }, []);
  const handleProjectDeleted = useCallback(async () => { if (user) await fetchProjects(user.uid); setSelectedProject(null); }, [user, fetchProjects]);
  const handleTaskDatesChange = useCallback(async (taskId: string, newStartDate: string, newDueDate: string) => { /* ... */ }, []);
  const handleSendChatMessage = useCallback(async (message: string) => { /* ... */ }, []);
  const handleShareProject = useCallback(async (projectId: string, email: string) => { /* ... */ }, []);


  // ★★★ ここから下が省略されていたJSXのreturn文です ★★★

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-700">データを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => setError(null)}
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
      {/* isLoadingがtrueの時だけLoadingOverlayを表示 */}
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
            onRequestTaskRegenerate={handleRegenerateTasks}
            isLoading={false} // Dashboard自体のisLoadingは別途管理
            isRegeneratingTasks={isRegeneratingTasks}
            isApiKeyAvailable={isApiKeyAvailable}
            groundingChunks={groundingChunks}
            chatHistory={chatHistory}
            onSendChatMessage={handleSendChatMessage}
            isChatLoading={isChatLoading}
            isChatAvailable={isChatAvailable}
            currentUserId={user.uid}
            onShareProject={handleShareProject}
          />
        ) : (
          <ProjectSelection
            projects={projects}
            onCreateProject={handleCreateProject}
            onSelectProject={handleSelectProject}
            onGenerateTasks={handleGenerateTasks}
            isApiKeyAvailable={isApiKeyAvailable}
            onProjectDeleted={handleProjectDeleted}
          />
        )}
      </div>
    </>
  );
};

export default App;