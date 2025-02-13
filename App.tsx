import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/Home';
import Upload from './screens/Upload';
import EditBill from './screens/EditBill';
import SplitBill from './screens/SplitBill';

export type RootStackParamList = {
  Home: undefined;
  Upload: undefined;
  EditBill: { items: any };
  SplitBill: { billData: any };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4F46E5'
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '600'
          }
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={Home}
          options={{
            title: 'BillSplitter'
          }}
        />
        <Stack.Screen 
          name="Upload" 
          component={Upload}
          options={{
            title: 'Upload Receipt'
          }}
        />
        <Stack.Screen 
          name="EditBill" 
          component={EditBill}
          options={{
            title: 'Edit Bill'
          }}
        />
        <Stack.Screen 
          name="SplitBill" 
          component={SplitBill}
          options={{
            title: 'Split Bill'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
