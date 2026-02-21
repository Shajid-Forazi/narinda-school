export const SUBJECTS = [
  { name: 'Bangla 1st paper', total: 100 },
  { name: 'Bangla 2nd paper', total: 100 },
  { name: 'English 1st paper', total: 100 },
  { name: 'English 2nd paper', total: 100 },
  { name: 'General Math.', total: 100 },
  { name: 'Social Science', total: 100 },
  { name: 'General Science', total: 100 },
  { name: 'Agriculture/Home Eco./Higher Math/Computer', total: 100 },
  { name: 'Religion', total: 100 },
  { name: 'History/Business Entrepreneurship/Physics', total: 100 },
  { name: 'Economics/civics/Finance & Banking/Chemistry', total: 100 },
  { name: 'Geography/Accounting/Biology', total: 100 },
  { name: 'Physical Studies', total: 100 },
  { name: 'Education For Work', total: 50 },
  { name: 'Music/Fine Art & craft', total: 50 },
  { name: 'Activity/Information & Communication Technology', total: 50 },
  { name: 'General Knowledge', total: 30 },
  { name: 'Drawing', total: 20 },
];

export const EXAM_NAMES = ['First Terminal', 'Second Terminal', 'Annual'];

export const getGradeInfo = (percentage: number, isHighClass: boolean) => {
  if (isHighClass) {
    // Class Five-Ten
    if (percentage >= 80) return { grade: 'A+', point: 5.00 };
    if (percentage >= 70) return { grade: 'A', point: 4.00 };
    if (percentage >= 60) return { grade: 'A-', point: 3.50 };
    if (percentage >= 50) return { grade: 'B', point: 3.00 };
    if (percentage >= 40) return { grade: 'C', point: 2.00 };
    if (percentage >= 33) return { grade: 'D', point: 1.00 };
    return { grade: 'F', point: 0.00 };
  } else {
    // Play Group - Class Four
    if (percentage >= 95) return { grade: 'A++', point: 5.00 };
    if (percentage >= 80) return { grade: 'A+', point: 4.50 };
    if (percentage >= 70) return { grade: 'A', point: 4.00 };
    if (percentage >= 60) return { grade: 'B+', point: 3.50 };
    if (percentage >= 50) return { grade: 'B', point: 3.00 };
    if (percentage >= 40) return { grade: 'C', point: 2.00 };
    if (percentage >= 33) return { grade: 'D', point: 1.00 };
    return { grade: 'F', point: 0.00 };
  }
};
