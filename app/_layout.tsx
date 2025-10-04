import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#1a1a1a" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a1a',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 18,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: '#1a1a1a',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{
            title: 'MorseFlasher',
            headerShown: true,
          }} 
        />
      </Stack>
    </>
  );
}
