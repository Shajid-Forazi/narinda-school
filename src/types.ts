export type Student = {
  id: string;
  sl_no: string;
  name_bengali: string;
  name_english: string;
  father_name: string;
  father_occupation: string;
  mother_name: string;
  mother_occupation: string;
  present_address: string;
  present_phone: string;
  permanent_address: string;
  permanent_phone: string;
  date_of_birth: string;
  class: string;
  section: string;
  shift: string;
  previous_institute: string;
  previous_address: string;
  previous_class: string;
  session: string;
  photo_url?: string;
  created_at?: string;
};

export type Payment = {
  id: string;
  student_id: string;
  year: string;
  month: string;
  admission_fee: number;
  backdue: number;
  salary: number;
  exam_fee: number;
  miscellaneous: number;
  created_at?: string;
};

export type ResultCard = {
  id: string;
  student_id: string;
  session: string;
  exam_type: string;
  subject: string;
  tutorial_marks: number;
  sub_marks: number;
  obj_marks: number;
  total_marks: number;
  grade: string;
  grade_point: number;
  created_at?: string;
};

export type Subject = {
  id: string;
  name: string;
  total_marks: number;
  has_tutorial: boolean;
  has_mcq: boolean;
  has_cq: boolean;
  order_index: number;
  created_at?: string;
};

export const CLASSES = ['Play Group', 'Nursery', 'K.G', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const SECTIONS = ['A', 'B', 'C', 'D'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
export const EXAM_TYPES = ['Half-Yearly', 'Final', 'Tutorial'];
export const SESSIONS = ['2024', '2025', '2026'];
