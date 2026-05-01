import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const HistoryDisplay = ({ moodHistory, appBgColor, onSelect }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mood Journal History</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
                {moodHistory.length === 0 ? (
                    <Text style={styles.emptyText}>No patterns recorded yet.</Text>
                ) : (
                    moodHistory.map((item) => (
                        <TouchableOpacity 
                            key={item.id} 
                            style={styles.historyItem}
                            onPress={() => onSelect && onSelect(item)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.historySwatch, { backgroundColor: item.color }]}>
                                <Text style={styles.historyEmoji}>{item.emoji}</Text>
                            </View>
                            <View style={styles.historyInfo}>
                                <Text style={styles.historyTime}>{item.timestamp}</Text>
                                <Text style={styles.historyCaption} numberOfLines={3}>
                                    {item.caption}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        paddingTop: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    listContent: {
        paddingBottom: 40,
        paddingHorizontal: 10,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 16,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 16,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    historySwatch: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    historyEmoji: {
        fontSize: 24,
    },
    historyInfo: {
        flex: 1,
    },
    historyTime: {
        fontSize: 12,
        color: '#888',
        fontWeight: '600',
        marginBottom: 4,
    },
    historyCaption: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
    },
});

export default HistoryDisplay;
