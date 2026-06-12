export interface ListMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export type LearningStatus = 'draft' | 'published' | 'archived'
export type MaterialType = 'document' | 'video' | 'link' | 'note' | 'worksheet'

export interface LearningRef {
  id: number
  name: string
  code?: string | null
  email?: string | null
}

export interface HomeworkAssignment {
  id: number
  academic_session_id: number | null
  class_id: number
  section_id: number | null
  subject_id: number | null
  created_by: number | null
  title: string
  instructions: string | null
  assigned_date: string
  due_date: string | null
  submission_required: boolean
  attachment_path: string | null
  attachment_url: string | null
  status: LearningStatus
  is_overdue: boolean
  published_at: string | null
  academic_session?: LearningRef | null
  class?: LearningRef | null
  section?: LearningRef | null
  subject?: LearningRef | null
  creator?: LearningRef | null
  created_at?: string
  updated_at?: string
}

export interface HomeworkPayload {
  academic_session_id?: number | null
  class_id: number
  section_id?: number | null
  subject_id?: number | null
  title: string
  instructions?: string | null
  assigned_date: string
  due_date?: string | null
  submission_required?: boolean
  status?: LearningStatus
}

export interface HomeworkListParams {
  page: number
  per_page: number
  search?: string
  academic_session_id?: number
  class_id?: number
  section_id?: number
  subject_id?: number
  status?: string
  due_from?: string
  due_to?: string
}

export interface HomeworkListResponse {
  items: HomeworkAssignment[]
  meta: ListMeta
}

export interface StudyMaterial {
  id: number
  academic_session_id: number | null
  class_id: number
  section_id: number | null
  subject_id: number | null
  created_by: number | null
  title: string
  description: string | null
  material_type: MaterialType
  content_url: string | null
  attachment_path: string | null
  attachment_url: string | null
  status: LearningStatus
  published_at: string | null
  academic_session?: LearningRef | null
  class?: LearningRef | null
  section?: LearningRef | null
  subject?: LearningRef | null
  creator?: LearningRef | null
  created_at?: string
  updated_at?: string
}

export interface StudyMaterialPayload {
  academic_session_id?: number | null
  class_id: number
  section_id?: number | null
  subject_id?: number | null
  title: string
  description?: string | null
  material_type: MaterialType
  content_url?: string | null
  status?: LearningStatus
}

export interface StudyMaterialListParams {
  page: number
  per_page: number
  search?: string
  academic_session_id?: number
  class_id?: number
  section_id?: number
  subject_id?: number
  material_type?: string
  status?: string
}

export interface StudyMaterialListResponse {
  items: StudyMaterial[]
  meta: ListMeta
}
