import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

interface BillItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

type EditBillScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditBill'>;

const EditBill: React.FC = () => {
  const navigation = useNavigation<EditBillScreenNavigationProp>();
  const route = useRoute();
  const [items, setItems] = useState<BillItem[]>([]);
  const [total, setTotal] = useState<number>(0);

  useEffect(() => {
    loadBillData();
  }, []);

  const loadBillData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('extractedBillData');
      if (storedData) {
        const extractedData = JSON.parse(storedData);
        const newItems = extractedData.items?.map((item: any, index: number) => ({
          id: index + 1,
          name: item.name,
          quantity: Number(item.quantity) || 1,
          price: parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0,

        })) || [];
        setItems(newItems);
        calculateTotal(newItems);
      } else {
        // Fallback to empty state if no data
        setItems([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Error loading bill data:', error);
      Alert.alert('Error', 'Could not load bill data');
      navigation.navigate('SplitBill', { billData: null });
    }
  };

  const calculateTotal = (items: BillItem[]) => {
    const sum = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    setTotal(sum);
  };

  const handleItemUpdate = (id: number, field: keyof BillItem, value: string | number) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        let processedValue = value;
        if (field === 'quantity' || field === 'price') {
          processedValue = parseFloat(value as string) || 0;
        }
        return { ...item, [field]: processedValue };
      }
      return item;
    });
    setItems(updatedItems);
    calculateTotal(updatedItems);
  };

  const handleAddItem = () => {
    const newItem: BillItem = {
      id: items.length + 1,
      name: '',
      quantity: 1,
      price: 0,
    };
    setItems([...items, newItem]);
  };

  const handleDeleteItem = (id: number) => {
    const updatedItems = items.filter(item => item.id !== id);
    setItems(updatedItems);
    calculateTotal(updatedItems);
  };

  const handleSave = async () => {
    try {
      const billData = {
        items,
        total
      };
      await AsyncStorage.setItem('extractedBillData', JSON.stringify(billData));
      navigation.navigate('SplitBill', { billData });
    } catch (error) {
      Alert.alert('Error', 'Could not save bill data');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.itemsContainer}>
        {items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <TextInput
              style={[styles.input, { marginRight: 8 }]}
              value={item.name}
              onChangeText={(value) => handleItemUpdate(item.id, 'name', value)}
              placeholder="Item name"
            />
            <TextInput
              style={[styles.numberInput, { marginRight: 8 }]}
              value={item.quantity.toString()}
              onChangeText={(value) => handleItemUpdate(item.id, 'quantity', value)}
              keyboardType="numeric"
              placeholder="Qty"
            />
            <TextInput
              style={[styles.numberInput, { marginRight: 8 }]}
              value={item.price.toFixed(2)}
              onChangeText={(value) => handleItemUpdate(item.id, 'price', value)}
              keyboardType="decimal-pad"
              placeholder="Price"
            />
            <TouchableOpacity
              onPress={() => handleDeleteItem(item.id)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddItem}
        >
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <View style={styles.footer}>
        <Text style={styles.totalText}>
          Total: ${total.toFixed(2)}
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, { marginRight: 12 }]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Save Changes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.navigate('SplitBill', { billData: null })}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  itemsContainer: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  input: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
  },
  numberInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default EditBill;
