// Calendar utility functions

export const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (date, weekStartDay = 0) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  
  // Adjust based on week start day
  // If week starts on Monday (1), shift: Sunday (0) -> 6, Monday (1) -> 0, etc.
  if (weekStartDay === 1) {
    return (firstDay + 6) % 7; // Shift so Monday = 0
  }
  return firstDay; // Default: Sunday = 0
};

export const formatDateKey = (date) => {
  return date.toDateString();
};

export const getMonthName = (date) => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

export const isSameMonth = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth();
};

export const isToday = (date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};
