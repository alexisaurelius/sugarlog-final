// Achievement system
// Audit completed: Removed redundant achievements and those too close together
export const ACHIEVEMENTS = [
  // First achievements (easiest)
  {
    id: 'first_entry',
    title: 'Taking Control',
    description: 'Log your first sugar intake entry',
    icon: 'add-circle',
    requirement: { type: 'trackingDays', value: 1 },
  },
  {
    id: 'first_day',
    title: 'In Control',
    description: 'Complete your first day under goal',
    icon: 'star',
    requirement: { type: 'streak', value: 1 },
  },
  // Early streak achievements
  {
    id: 'three_days',
    title: 'Building Strength',
    description: 'Stay under goal for 3 consecutive days',
    icon: 'flame',
    requirement: { type: 'streak', value: 3 },
  },
  {
    id: 'five_days',
    title: 'Five Day Champion',
    description: 'Stay under goal for 5 consecutive days',
    icon: 'star',
    requirement: { type: 'streak', value: 5 },
  },
  {
    id: 'one_week',
    title: 'Week of Control',
    description: 'Stay under goal for 7 consecutive days',
    icon: 'trophy',
    requirement: { type: 'streak', value: 7 },
  },
  {
    id: 'track_week',
    title: 'Consistent Tracker',
    description: 'Track your intake for 7 consecutive days',
    icon: 'checkmark-done',
    requirement: { type: 'trackingStreak', value: 7 },
  },
  {
    id: 'ten_days',
    title: 'Ten Days Strong',
    description: 'Stay under goal for 10 consecutive days',
    icon: 'medal',
    requirement: { type: 'streak', value: 10 },
  },
  {
    id: 'two_weeks',
    title: 'Two Weeks Strong',
    description: 'Stay under goal for 14 consecutive days',
    icon: 'medal',
    requirement: { type: 'streak', value: 14 },
  },
  {
    id: 'track_two_weeks',
    title: 'Dedicated Logger',
    description: 'Track your intake for 14 consecutive days',
    icon: 'list',
    requirement: { type: 'trackingStreak', value: 14 },
  },
  {
    id: 'three_weeks',
    title: 'Three Weeks Empowered',
    description: 'Stay under goal for 21 consecutive days',
    icon: 'shield',
    requirement: { type: 'streak', value: 21 },
  },
  {
    id: 'twenty_five_success',
    title: 'Twenty-Five Days Strong',
    description: 'Achieve 25 successful days',
    icon: 'star-half',
    requirement: { type: 'successDays', value: 25 },
  },
  // Month achievements
  {
    id: 'track_total_30',
    title: 'Thirty Day Tracker',
    description: 'Track your intake for 30 days total',
    icon: 'document-text',
    requirement: { type: 'trackingDays', value: 30 },
  },
  {
    id: 'one_month',
    title: 'Month in Control',
    description: 'Stay under goal for 30 consecutive days',
    icon: 'diamond',
    requirement: { type: 'streak', value: 30 },
  },
  {
    id: 'track_month',
    title: 'Daily Logger',
    description: 'Track your intake for 30 consecutive days',
    icon: 'calendar',
    requirement: { type: 'trackingStreak', value: 30 },
  },
  {
    id: 'fifty_success',
    title: 'Fifty Days Free',
    description: 'Achieve 50 successful days',
    icon: 'ribbon',
    requirement: { type: 'successDays', value: 50 },
  },
  // Two month achievements
  {
    id: 'two_months',
    title: 'Two Months Strong',
    description: 'Stay under goal for 60 consecutive days',
    icon: 'calendar',
    requirement: { type: 'streak', value: 60 },
  },
  {
    id: 'track_total_60',
    title: 'Sixty Day Tracker',
    description: 'Track your intake for 60 days total',
    icon: 'folder',
    requirement: { type: 'trackingDays', value: 60 },
  },
  {
    id: 'track_60_days',
    title: 'Habit Builder',
    description: 'Track your intake for 60 consecutive days',
    icon: 'time',
    requirement: { type: 'trackingStreak', value: 60 },
  },
  {
    id: 'seventy_five_success',
    title: 'Seventy-Five Days Free',
    description: 'Achieve 75 successful days',
    icon: 'ribbon-outline',
    requirement: { type: 'successDays', value: 75 },
  },
  // Three month achievements
  {
    id: 'three_months',
    title: 'Three Months Empowered',
    description: 'Stay under goal for 90 consecutive days',
    icon: 'trophy-outline',
    requirement: { type: 'streak', value: 90 },
  },
  // Century achievements
  {
    id: 'hundred_success',
    title: 'One Hundred Days Free',
    description: 'Achieve 100 successful days',
    icon: 'star-outline',
    requirement: { type: 'successDays', value: 100 },
  },
  {
    id: 'track_total_100',
    title: 'Century Tracker',
    description: 'Track your intake for 100 days total',
    icon: 'library',
    requirement: { type: 'trackingDays', value: 100 },
  },
  {
    id: 'track_100_days',
    title: 'Tracking Master',
    description: 'Track your intake for 100 consecutive days',
    icon: 'bar-chart',
    requirement: { type: 'trackingStreak', value: 100 },
  },
  // Six month achievements
  {
    id: 'six_months',
    title: 'Six Months Strong',
    description: 'Stay under goal for 180 consecutive days',
    icon: 'medal-outline',
    requirement: { type: 'streak', value: 180 },
  },
  {
    id: 'two_hundred_success',
    title: 'Two Hundred Days Free',
    description: 'Achieve 200 successful days',
    icon: 'star',
    requirement: { type: 'successDays', value: 200 },
  },
  {
    id: 'track_total_200',
    title: 'Double Century Tracker',
    description: 'Track your intake for 200 days total',
    icon: 'archive',
    requirement: { type: 'trackingDays', value: 200 },
  },
  {
    id: 'three_hundred_success',
    title: 'Three Hundred Days Free',
    description: 'Achieve 300 successful days',
    icon: 'trophy',
    requirement: { type: 'successDays', value: 300 },
  },
  // Year achievements
  {
    id: 'track_total_365',
    title: 'Year Tracker',
    description: 'Track your intake for 365 days total',
    icon: 'calendar',
    requirement: { type: 'trackingDays', value: 365 },
  },
  {
    id: 'one_year',
    title: 'Year in Control',
    description: 'Stay under goal for 365 consecutive days',
    icon: 'diamond-outline',
    requirement: { type: 'streak', value: 365 },
  },
  // Elite achievements
  {
    id: 'five_hundred_success',
    title: 'Five Hundred Days Free',
    description: 'Achieve 500 successful days',
    icon: 'diamond',
    requirement: { type: 'successDays', value: 500 },
  },
  // Two year achievements (730 days)
  {
    id: 'two_year_streak',
    title: 'Two Years in Control',
    description: 'Stay under goal for 730 consecutive days',
    icon: 'trophy',
    requirement: { type: 'streak', value: 730 },
  },
  {
    id: 'two_year_success',
    title: 'Two Years Free',
    description: 'Achieve 730 successful days',
    icon: 'star',
    requirement: { type: 'successDays', value: 730 },
  },
  {
    id: 'two_year_tracking',
    title: 'Two Year Tracker',
    description: 'Track your intake for 730 days total',
    icon: 'calendar',
    requirement: { type: 'trackingDays', value: 730 },
  },
  // Three year achievements (1095 days)
  {
    id: 'three_year_streak',
    title: 'Three Years in Control',
    description: 'Stay under goal for 1095 consecutive days',
    icon: 'diamond',
    requirement: { type: 'streak', value: 1095 },
  },
  {
    id: 'three_year_success',
    title: 'Three Years Free',
    description: 'Achieve 1095 successful days',
    icon: 'medal',
    requirement: { type: 'successDays', value: 1095 },
  },
  {
    id: 'three_year_tracking',
    title: 'Three Year Tracker',
    description: 'Track your intake for 1095 days total',
    icon: 'archive',
    requirement: { type: 'trackingDays', value: 1095 },
  },
  // Four year achievements (1460 days)
  {
    id: 'four_year_streak',
    title: 'Four Years in Control',
    description: 'Stay under goal for 1460 consecutive days',
    icon: 'trophy',
    requirement: { type: 'streak', value: 1460 },
  },
  // Five year achievement (1825 days)
  {
    id: 'five_year_streak',
    title: 'Five Years in Control',
    description: 'Stay under goal for 1825 consecutive days',
    icon: 'diamond',
    requirement: { type: 'streak', value: 1825 },
  },
];

export const checkAchievements = (
  streak, 
  successDays, 
  unlockedAchievements = [],
  trackingDays = 0,
  trackingStreak = 0
) => {
  const newAchievements = [];
  
  ACHIEVEMENTS.forEach((achievement) => {
    if (unlockedAchievements.includes(achievement.id)) {
      return; // Already unlocked
    }
    
    let unlocked = false;
    if (achievement.requirement.type === 'streak') {
      unlocked = streak >= achievement.requirement.value;
    } else if (achievement.requirement.type === 'successDays') {
      unlocked = successDays >= achievement.requirement.value;
    } else if (achievement.requirement.type === 'trackingDays') {
      unlocked = trackingDays >= achievement.requirement.value;
    } else if (achievement.requirement.type === 'trackingStreak') {
      unlocked = trackingStreak >= achievement.requirement.value;
    }
    
    if (unlocked) {
      newAchievements.push(achievement);
    }
  });
  
  return newAchievements;
};
