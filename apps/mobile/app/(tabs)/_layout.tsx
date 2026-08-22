import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { color: '#0F172A', fontWeight: '600' },
        headerShadowVisible: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { borderTopColor: '#E2E8F0' },
        sceneStyle: { backgroundColor: '#F5F7FA' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>☑</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Times',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>◉</Text>
          ),
        }}
      />
    </Tabs>
  )
}
