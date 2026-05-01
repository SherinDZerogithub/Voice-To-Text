import re
import os

file_path = r"d:\git_Repo\Voice-To-Text\myapp\App.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add imports
import_insert_pos = content.find("import AnalyticsDisplay")
if import_insert_pos != -1:
    imports_to_add = "import HistoryDisplay from './components/HistoryDisplay';\nimport Icon from 'react-native-vector-icons/MaterialCommunityIcons';\n"
    content = content[:import_insert_pos] + imports_to_add + content[import_insert_pos:]

# 2. Add TouchableOpacity to react-native imports if not present
if "TouchableOpacity" not in content[:content.find("from 'react-native'")]:
    content = content.replace("Dimensions,\n} from 'react-native';", "Dimensions,\n  TouchableOpacity,\n} from 'react-native';")

# 3. Add activeTab state and fetchAnalyticsData
state_hook_pos = content.find("const [historyVisible, setHistoryVisible] = useState(false);")
if state_hook_pos != -1:
    state_to_add = """  const [activeTab, setActiveTab] = useState('home'); // 'home', 'history', 'analytics'

  const fetchAnalyticsData = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/analytics/me?days=30`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.warn('Analytics fetch failed:', error);
    }
  }, [BACKEND_URL, token]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
    }
  }, [activeTab, fetchAnalyticsData]);

"""
    content = content[:state_hook_pos] + state_to_add + content[state_hook_pos:]

# 4. Modify DashboardHero onOpenHistory to setActiveTab
content = content.replace("onOpenHistory={() => toggleHistory(true)}", "onOpenHistory={() => setActiveTab('history')}")

# 5. Add Tab Bar Styles
styles_insert_pos = content.find("  const handleAuth = async (isLogin, email, password, name, avatarConfigParam) => {")
if styles_insert_pos != -1:
    # Find the end of styles.create
    styles_end_pos = content.rfind("  });", 0, styles_insert_pos)
    if styles_end_pos != -1:
        styles_to_add = """,
    tabBar: {
      flexDirection: 'row',
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderTopColor: '#eee',
      paddingBottom: Platform.OS === 'ios' ? 20 : 10,
      paddingTop: 10,
      justifyContent: 'space-around',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    tabItem: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    tabText: {
      fontSize: 12,
      marginTop: 4,
      fontWeight: '600',
    }"""
        content = content[:styles_end_pos] + styles_to_add + content[styles_end_pos:]

# 6. Replace return render
return_start = content.find("  return (\n    <View style={{ flex: 1 }}>")
if return_start != -1:
    new_render = """  const renderContent = () => {
    if (activeTab === 'analytics') {
      return <AnalyticsDisplay analyticsData={analyticsData} appBgColor={appBgColor} />;
    } else if (activeTab === 'history') {
      return <HistoryDisplay moodHistory={moodHistory} appBgColor={appBgColor} />;
    } else {
      return (
        <>
          <VoiceInput
            text={text}
            onChangeText={setText}
            isListening={isListening}
            onStartListening={startListening}
            onStopListening={stopListening}
            onAnalyze={() => analyzeMood(text)}
            isAnalyzing={isAnalyzing}
            appBgColor={appBgColor}
            shortDescription={moodData?.short_description}
            longDescription={moodData?.description}
          />

          <Text style={styles.statusText}>
            {isListening
              ? 'Recording active...'
              : isVoiceAvailable
                ? 'Tap button to start'
                : 'Speech recognition unavailable'}
          </Text>
          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

          <MoodResult
            moodData={moodData}
            isAnalyzing={isAnalyzing}
            isListening={isListening}
            hasText={text.length > 0}
            setAppBgColor={setAppBgColor}
            appBgColor={appBgColor}
          />

          <ImageGallery
            images={images}
            sampleImages={SAMPLE_IMAGES}
            onCapture={handleCaptureImage}
            onSelect={handleSelectImage}
            onAnalyzeImage={analyzeImageDescription}
            isCapturingImage={isCapturingImage}
            isSelectingImage={isSelectingImage}
            isAnalyzing={isAnalyzing}
          />
        </>
      );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: appBgColor }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHero
          appBgColor={appBgColor}
          avatarAnim={avatarAnim}
          avatarConfig={avatarConfig}
          isLoginFlow={isLoginFlow}
          onEditAvatar={() => setAvatarVisible(true)}
          onLogout={handleLogout}
          onOpenHistory={() => setActiveTab('history')}
          userName={userName}
        />

        {renderContent()}

        <AvatarBuilder
          visible={avatarVisible}
          onClose={() => setAvatarVisible(false)}
          onSave={async (config, svgString) => {
            setAvatarConfig(config);
            setAvatarVisible(false);
            try {
              await fetch(`${BACKEND_URL}/update-avatar`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
              }).then(response => {
                if (!response.ok) throw new Error('Failed to save avatar.');
                Alert.alert('Success', 'Avatar updated successfully!');
              })
            } catch (error) {
              console.error('Failed to update avatar:', error);
              Alert.alert('Error', error.message || 'Failed to update avatar.');
            }
          }}
        />
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
          <Icon name="home" size={24} color={activeTab === 'home' ? '#6c5ce7' : '#999'} />
          <Text style={[styles.tabText, { color: activeTab === 'home' ? '#6c5ce7' : '#999' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('history')}>
          <Icon name="history" size={24} color={activeTab === 'history' ? '#6c5ce7' : '#999'} />
          <Text style={[styles.tabText, { color: activeTab === 'history' ? '#6c5ce7' : '#999' }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('analytics')}>
          <Icon name="chart-bar" size={24} color={activeTab === 'analytics' ? '#6c5ce7' : '#999'} />
          <Text style={[styles.tabText, { color: activeTab === 'analytics' ? '#6c5ce7' : '#999' }]}>Analytics</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default App;
"""
    content = content[:return_start] + new_render

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("App.jsx updated successfully!")
