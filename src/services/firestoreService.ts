import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, getDocs, Timestamp, writeBatch, DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import type { Project, Task, ProjectVisibility } from '../types';

// --- Helper Functions ---

const convertTimestampToString = (timestamp: any): string | undefined => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString().split('T')[0];
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return undefined;
};

const convertStringToTimestamp = (dateString: string | undefined): Timestamp | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return null;
    }
    return Timestamp.fromDate(date);
  } catch (e) {
    return null;
  }
};

const mapDocToProject = (doc: DocumentSnapshot): Project => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        name: data.name || '無題のプロジェクト',
        overview: data.overview || '',
        startDate: convertTimestampToString(data.startDate) || '',
        dueDate: convertTimestampToString(data.dueDate) || '',
        purpose: data.purpose,
        acceptanceCriteria: data.acceptanceCriteria,
        ownerId: data.ownerId,
        visibility: data.visibility || 'private',
        createdAt: convertTimestampToString(data.createdAt),
        updatedAt: convertTimestampToString(data.updatedAt),
        tasks: [],
        additionalNotes: data.additionalNotes,
    } as Project;
}

const mapDocToTask = (doc: DocumentSnapshot): Task => {
    const data = doc.data() || {};
    return {
        id: doc.id,
        code: data.code || '',
        name: data.name || '無題のタスク',
        description: data.description || '',
        status: data.status || '未着手',
        startDate: convertTimestampToString(data.startDate) || '',
        dueDate: convertTimestampToString(data.dueDate) || '',
        purpose: data.purpose,
        acceptanceCriteria: data.acceptanceCriteria,
        assignee: data.assignee,
        dependsOn: data.dependsOn || [], // ★★★ ここが重要！nullやundefinedを[]に変換 ★★★
        createdAt: convertTimestampToString(data.createdAt),
        updatedAt: convertTimestampToString(data.updatedAt),
    } as Task;
}

// --- Project Functions ---

export const saveProject = async (project: Omit<Project, 'tasks'>, userId: string) => {
  const projectRef = doc(db, "projects", project.id);
  const { tasks, ...projectToSave } = project as any;

  await setDoc(projectRef, {
    ...projectToSave,
    ownerId: userId,
    visibility: 'private',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    startDate: convertStringToTimestamp(project.startDate),
    dueDate: convertStringToTimestamp(project.dueDate),
  });
};

export const updateProject = async (project: Partial<Project> & { id: string }) => {
  const projectRef = doc(db, "projects", project.id);
  const { id, tasks, createdAt, ...updateData } = project as any;
  
  updateData.updatedAt = Timestamp.now();

  if (project.startDate) {
    updateData.startDate = convertStringToTimestamp(project.startDate);
  }
  if (project.dueDate) {
    updateData.dueDate = convertStringToTimestamp(project.dueDate);
  }

  await updateDoc(projectRef, updateData);
};

export const updateProjectVisibility = async (projectId: string, visibility: ProjectVisibility) => {
  const projectRef = doc(db, "projects", projectId);
  await updateDoc(projectRef, { 
    visibility: visibility,
    updatedAt: Timestamp.now(),
  });
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  const projectRef = doc(db, "projects", projectId);
  const projectSnap = await getDoc(projectRef);
  if (projectSnap.exists()) {
    return mapDocToProject(projectSnap);
  } else {
    return null;
  }
};

export const deleteProject = async (projectId: string) => {
  const tasksRef = collection(db, "projects", projectId, "tasks");
  const tasksSnapshot = await getDocs(tasksRef);
  const batch = writeBatch(db);
  tasksSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  await deleteDoc(doc(db, "projects", projectId));
};

export const getProjectsForUser = async (userId: string): Promise<Project[]> => {
  const projectsRef = collection(db, "projects");

  const ownedQuery = query(projectsRef, where("ownerId", "==", userId));
  const publicQuery = query(projectsRef, where("visibility", "in", ['public_view', 'public_edit']));

  const [ownedSnapshot, publicSnapshot] = await Promise.all([
    getDocs(ownedQuery),
    getDocs(publicQuery)
  ]);

  const projectsMap = new Map<string, Project>();

  const processSnapshot = (snapshot: QuerySnapshot) => {
    snapshot.docs.forEach((doc) => {
      const project = mapDocToProject(doc);
      projectsMap.set(doc.id, project);
    });
  };

  processSnapshot(ownedSnapshot);
  processSnapshot(publicSnapshot);

  return Array.from(projectsMap.values());
};


// --- Task Functions ---

export const saveTask = async (projectId: string, task: Omit<Task, 'createdAt' | 'updatedAt'>) => {
  const taskRef = doc(db, "projects", projectId, "tasks", task.id);
  await setDoc(taskRef, {
    ...task,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    startDate: convertStringToTimestamp(task.startDate),
    dueDate: convertStringToTimestamp(task.dueDate),
  });
};

export const updateTask = async (projectId: string, task: Task) => {
  const taskRef = doc(db, "projects", projectId, "tasks", task.id);
  const { id, createdAt, ...taskToUpdate } = task as any;
  await updateDoc(taskRef, {
    ...taskToUpdate,
    updatedAt: Timestamp.now(),
    startDate: convertStringToTimestamp(taskToUpdate.startDate),
    dueDate: convertStringToTimestamp(taskToUpdate.dueDate),
  });
};

export const deleteTask = async (projectId: string, taskId: string) => {
  await deleteDoc(doc(db, "projects", projectId, "tasks", taskId));
};

export const getTasksForProject = async (projectId: string): Promise<Task[]> => {
  const tasksCol = collection(db, "projects", projectId, "tasks");
  const taskSnapshot = await getDocs(tasksCol);
  return taskSnapshot.docs.map(mapDocToTask);
};
