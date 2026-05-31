# Interactive Mood Features Integration Guide

## Overview
This guide explains how to integrate the 6 new interactive mood-tracking features into your existing React Native app.

## Features Included

### 1. **Mood Garden** (`MoodGarden.jsx`)
- **Purpose**: Replace the bar chart with an interactive garden visualization
- **Features**:
  - Dynamic plant generation based on mood data
  - Animated plant entrance with staggered timing
  - Interactive plant tap to view details
  - Garden health indicator
  - Soil visualization with SVG

**Integration Steps**:
```jsx
import MoodGarden from './components/MoodGarden';

// In your Analytics/Journey tab:
<MoodGarden 
  analyticsData={analyticsData}
  onPlantTap={(plant) => console.log('Tapped:', plant)}
  moodHistory={moodHistory}
/>
```

**Props**:
- `analyticsData` (object): Analytics data with vibe_breakdown
- `onPlantTap` (function): Callback when a plant is tapped
- `moodHistory` (array): Array of mood entries

---

### 2. **Mood Dice** (`MoodDice.jsx`)
- **Purpose**: Interactive dice with journal prompts
- **Features**:
  - Animated dice rolling with 3D effect
  - 6 different journal prompts
  - Auto-saves responses to journal
  - Recent rolls history
  - Smooth modal transitions

**Integration Steps**:
```jsx
import MoodDice from './components/MoodDice';

// In your Home tab:
<MoodDice 
  onJournalEntry={(entry) => {
    // Handle journal entry
    console.log('Journal entry:', entry);
  }}
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

**Props**:
- `onJournalEntry` (function): Called when user saves a journal entry
- `onTabChange` (function): Called to navigate to another tab

**Returned Entry Object**:
```javascript
{
  prompt: string,
  response: string,
  category: string,
  timestamp: ISO string
}
```

---

### 3. **Mood Twin** (`MoodTwin.jsx`)
- **Purpose**: Interactive avatar with mood detection
- **Features**:
  - Real-time mood detection from text input
  - Animated avatar expressions (happy, sad, calm, anxious, hopeful, tired)
  - Color-changing avatar based on mood
  - Breathing animation for calming moods
  - Confetti animation for happy moods

**Integration Steps**:
```jsx
import MoodTwin from './components/MoodTwin';

// In your Home tab:
<MoodTwin 
  onCheckIn={(checkIn) => {
    // Handle check-in
    console.log('Check-in:', checkIn);
  }}
  onTabChange={(tab) => setActiveTab(tab)}
/>
```

**Props**:
- `onCheckIn` (function): Called when user saves a check-in
- `onTabChange` (function): Called to navigate to another tab

**Returned Check-in Object**:
```javascript
{
  response: string,
  mood: string,
  timestamp: ISO string
}
```

---

### 4. **Mood Jar** (`MoodJar.jsx`)
- **Purpose**: Gratitude container with gem animations
- **Features**:
  - 7-gem jar system (unlocks celebration at 7)
  - Animated gem additions with color variety
  - Fill level indicator
  - Release worry functionality
  - Recent gratitudes list
  - Celebration animation when jar fills

**Integration Steps**:
```jsx
import MoodJar from './components/MoodJar';

// In your Home tab:
<MoodJar 
  onGemAdded={(gem) => {
    // Handle new gem
    console.log('Gem added:', gem);
  }}
  onJarFull={(jarData) => {
    // Handle jar completion
    console.log('Jar full:', jarData);
  }}
/>
```

**Props**:
- `onGemAdded` (function): Called when a gratitude is added
- `onJarFull` (function): Called when jar reaches 7 gems

**Gem Object**:
```javascript
{
  id: number,
  text: string,
  color: string,
  timestamp: ISO string
}
```

---

### 5. **Goal Alignment Ring** (`GoalAlignmentRing.jsx`)
- **Purpose**: Compass-like goal progress tracker
- **Features**:
  - Animated compass ring with progress indicator
  - Needle animation showing goal alignment
  - Next steps recommendations
  - Goal details modal
  - Cardinal direction markers
  - Dynamic messaging based on progress

**Integration Steps**:
```jsx
import GoalAlignmentRing from './components/GoalAlignmentRing';

// In your Journey/Analytics tab:
<GoalAlignmentRing 
  moodGoal={moodGoal}
  analyticsData={analyticsData}
  onGoalUpdate={(newGoal) => {
    // Handle goal update
    console.log('Goal updated:', newGoal);
  }}
/>
```

**Props**:
- `moodGoal` (object): Current mood goal with vibes array
- `analyticsData` (object): Analytics data with total_entries, vibe_breakdown
- `onGoalUpdate` (function): Called when goal is updated

---

### 6. **Celebration Corner** (`CelebrationCorner.jsx`)
- **Purpose**: Badge system with unlockable rewards
- **Features**:
  - 10 different achievement badges
  - Automatic badge unlocking based on conditions
  - Progress bar showing completion percentage
  - Badge detail modals
  - Celebration animation on new unlocks
  - Stats showing unlocked/locked/rarity

**Integration Steps**:
```jsx
import CelebrationCorner from './components/CelebrationCorner';

// In your Journey/Analytics tab:
<CelebrationCorner 
  analyticsData={analyticsData}
  moodHistory={moodHistory}
/>
```

**Props**:
- `analyticsData` (object): Analytics data
- `moodHistory` (array): Array of all mood entries

**Available Badges**:
1. **First Step** - 1 entry
2. **3-Day Flame** - 3 consecutive days
3. **Week Warrior** - 7 consecutive days
4. **Explorer** - 5 unique moods
5. **Garden Keeper** - 7 plants in garden
6. **Goal Achiever** - Goal completed
7. **Gratitude Collector** - 7 gratitudes
8. **Reflection Master** - 10 journal entries
9. **Mood Detective** - Analytics viewed
10. **Resilience Champion** - 5 challenging entries

---

## Installation Steps

### 1. Copy Component Files
```bash
cp MoodGarden.jsx /path/to/app/components/
cp MoodDice.jsx /path/to/app/components/
cp MoodTwin.jsx /path/to/app/components/
cp MoodJar.jsx /path/to/app/components/
cp GoalAlignmentRing.jsx /path/to/app/components/
cp CelebrationCorner.jsx /path/to/app/components/
```

### 2. Update App.jsx Navigation
```jsx
// Add imports
import MoodGarden from './components/MoodGarden';
import MoodDice from './components/MoodDice';
import MoodTwin from './components/MoodTwin';
import MoodJar from './components/MoodJar';
import GoalAlignmentRing from './components/GoalAlignmentRing';
import CelebrationCorner from './components/CelebrationCorner';

// Add to Home tab
<ScrollView>
  <MoodTwin onCheckIn={handleCheckIn} onTabChange={setActiveTab} />
  <MoodDice onJournalEntry={handleJournalEntry} onTabChange={setActiveTab} />
  <MoodJar onGemAdded={handleGemAdded} onJarFull={handleJarFull} />
  {/* Other components */}
</ScrollView>

// Add to Journey/Analytics tab
<ScrollView>
  <MoodGarden analyticsData={analyticsData} moodHistory={moodHistory} />
  <GoalAlignmentRing moodGoal={moodGoal} analyticsData={analyticsData} />
  <CelebrationCorner analyticsData={analyticsData} moodHistory={moodHistory} />
  {/* Other components */}
</ScrollView>
```

### 3. Update State Management
```jsx
// Add to your main App state
const [gems, setGems] = useState([]);
const [checkIns, setCheckIns] = useState([]);

// Add handlers
const handleCheckIn = (checkIn) => {
  setCheckIns([...checkIns, checkIn]);
  // Optionally save to backend
};

const handleGemAdded = (gem) => {
  setGems([...gems, gem]);
};

const handleJarFull = (jarData) => {
  // Trigger celebration or unlock achievement
};
```

---

## Data Requirements

### analyticsData Structure
```javascript
{
  total_entries: number,
  consecutive_days: number,
  vibe_breakdown: [
    { label: string, count: number },
    // ...
  ],
  goal_completed: boolean,
  gratitude_count: number
}
```

### moodGoal Structure
```javascript
{
  vibe: string,
  vibes: [string],
  updated_at: ISO string
}
```

### moodHistory Structure
```javascript
[
  {
    id: string,
    timestamp: ISO string,
    vibe: string,
    emoji: string,
    color: string,
    caption: string,
    reflection: string,
    // ... other fields
  },
  // ...
]
```

---

## Customization

### Colors
Each component uses a color system. Modify the color constants:
- Primary: `#6c5ce7` (purple)
- Success: `#6BCB77` (green)
- Warning: `#FF6B6B` (red)
- Info: `#FFD93D` (yellow)

### Animations
All animations use React Native's `Animated` API. Adjust timing:
- `friction`: Controls bounciness (lower = bouncier)
- `tension`: Controls speed (higher = faster)
- `duration`: Controls timing (in milliseconds)

### Prompts (Mood Dice)
Edit the `DICE_PROMPTS` array in `MoodDice.jsx` to customize prompts.

### Badges (Celebration Corner)
Edit the `BADGES` array in `CelebrationCorner.jsx` to add/modify badges.

---

## Backend Integration

### Saving Data to Backend

**For Journal Entries (Mood Dice)**:
```javascript
const handleJournalEntry = async (entry) => {
  const response = await fetch(`${BACKEND_URL}/mood-log/journal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      prompt: entry.prompt,
      response: entry.response,
      category: entry.category
    })
  });
};
```

**For Check-ins (Mood Twin)**:
```javascript
const handleCheckIn = async (checkIn) => {
  const response = await fetch(`${BACKEND_URL}/mood-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      vibe: checkIn.mood,
      caption: checkIn.response
    })
  });
};
```

**For Gratitudes (Mood Jar)**:
```javascript
const handleGemAdded = async (gem) => {
  const response = await fetch(`${BACKEND_URL}/gratitude`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      text: gem.text,
      timestamp: gem.timestamp
    })
  });
};
```

---

## Troubleshooting

### Animations Not Working
- Ensure `useNativeDriver: true` is set for performance
- Check that Animated values are properly initialized

### Components Not Rendering
- Verify all props are passed correctly
- Check console for missing dependencies
- Ensure SVG library is installed: `npm install react-native-svg`

### Data Not Updating
- Verify state management is connected
- Check that callbacks are properly defined
- Ensure backend endpoints are correct

---

## Performance Tips

1. **Memoize Components**: Use `React.memo()` for heavy components
2. **Lazy Load**: Load features on-demand
3. **Optimize Animations**: Use `useNativeDriver` for all animations
4. **Batch Updates**: Group state updates together
5. **Cache Data**: Store analytics data locally when possible

---

## Support

For issues or questions:
1. Check the component props documentation
2. Review the integration examples
3. Test with sample data first
4. Check React Native and SVG documentation

---

## License

These components are provided as-is for your mood tracking application.
