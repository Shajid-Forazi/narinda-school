import { getGradeInfo } from './constants';

export const toBengaliNumber = (num: string | number): string => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
};

export const calculateGrade = (marks: number, maxMarks: number = 100, className: string = 'One') => {
  const percentage = (marks / maxMarks) * 100;
  const highClasses = ['Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const isHighClass = highClasses.some(c => className.includes(c));
  
  return getGradeInfo(percentage, isHighClass);
};

export const formatCurrency = (amount: number) => {
  return toBengaliNumber(amount.toFixed(0));
};
