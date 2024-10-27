import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../App';

interface BillItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  assignedTo: number[];
}

interface Person {
  id: number;
  name: string;
  total: number;
  equalSplit: number;
}

type SplitBillScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SplitBill'>;

const SplitBill: React.FC = () => {
  const navigation = useNavigation<SplitBillScreenNavigationProp>();
  const route = useRoute();

  const [items, setItems] = useState<BillItem[]>([]);
  const [people, setPeople] = useState<Person[]>([
    { id: 1, name: 'Person 1', total: 0, equalSplit: 0 },
  ]);
  const [subtotal, setSubtotal] = useState(0);
  const [tipPercentage, setTipPercentage] = useState(10);
  const [tipAmount, setTipAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [editingQuantity, setEditingQuantity] = useState<{[key: number]: string}>({});
  const [editingPrice, setEditingPrice] = useState<{[key: number]: string}>({});

  useEffect(() => {
    loadBillData();
  }, []);

  useEffect(() => {
    calculateTipAndTotal();
  }, [subtotal, tipPercentage]);

  useEffect(() => {
    calculateEqualSplits();
  }, [total, people.length]);

  const loadBillData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('extractedBillData');
      if (storedData) {
        const extractedData = JSON.parse(storedData);
        const newItems = extractedData.items?.map((item: any, index: number) => ({
          id: index + 1,
          name: item.name,
          quantity: parseFloat(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
          assignedTo: [],
        })) || [];
        setItems(newItems);
        
        // Initialize editing states
        const quantityState: {[key: number]: string} = {};
        const priceState: {[key: number]: string} = {};
        newItems.forEach(item => {
          quantityState[item.id] = item.quantity.toString();
          priceState[item.id] = item.price.toString();
        });
        setEditingQuantity(quantityState);
        setEditingPrice(priceState);
        
        calculateSubtotal(newItems);
      }
    } catch (error) {
      console.error('Error loading bill data:', error);
      Alert.alert('Error', 'Could not load bill data');
    }
  };

  const calculateSubtotal = (items: BillItem[]) => {
    const newSubtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    setSubtotal(newSubtotal);
  };

  const calculateTipAndTotal = () => {
    const newTipAmount = (subtotal * tipPercentage) / 100;
    setTipAmount(newTipAmount);
    setTotal(subtotal + newTipAmount);
  };

  const calculateEqualSplits = () => {
    const equalSplitAmount = total / people.length;
    setPeople(people.map(person => ({
      ...person,
      equalSplit: equalSplitAmount,
    })));
  };

  const handleTipPercentageChange = (value: string) => {
    const newTipPercentage = Math.max(0, Math.min(100, Number(value) || 0));
    setTipPercentage(newTipPercentage);
  };

  const handleAddPerson = () => {
    const newPerson: Person = {
      id: people.length + 1,
      name: `Person ${people.length + 1}`,
      total: 0,
      equalSplit: total / (people.length + 1),
    };
    setPeople([...people, newPerson]);
  };

  const handlePersonNameChange = (id: number, name: string) => {
    setPeople(people.map(person =>
      person.id === id ? { ...person, name } : person
    ));
  };

  const handleItemNameChange = (id: number, name: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, name } : item
    ));
  };

  const handleItemQuantityChange = (id: number, value: string) => {
    // Update the editing state
    setEditingQuantity(prev => ({
      ...prev,
      [id]: value
    }));

    // Only update the actual quantity if the value is valid
    const quantity = Math.max(1, Number(value) || 1);
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, quantity } : item
    );
    setItems(updatedItems);
    calculateSubtotal(updatedItems);
  };

  const handleItemPriceChange = (id: number, value: string) => {
    // Update the editing state
    setEditingPrice(prev => ({
      ...prev,
      [id]: value
    }));

    // Only update the actual price if the value is valid
    const price = Math.max(0, Number(value) || 0);
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, price } : item
    );
    setItems(updatedItems);
    calculateSubtotal(updatedItems);
  };

  const handleItemAssignment = (itemId: number, personId: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const assignedTo = item.assignedTo.includes(personId)
          ? item.assignedTo.filter(id => id !== personId)
          : [...item.assignedTo, personId];
        return { ...item, assignedTo };
      }
      return item;
    }));
  };

  const calculateSplitTotals = () => {
    const newPeople = people.map(person => ({ ...person, total: 0 }));
    
    items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const assignedCount = item.assignedTo.length || people.length;
      const splitAmount = itemTotal / assignedCount;
      
      if (item.assignedTo.length === 0) {
        newPeople.forEach(person => {
          person.total += splitAmount;
        });
      } else {
        item.assignedTo.forEach(personId => {
          const person = newPeople.find(p => p.id === personId);
          if (person) {
            person.total += splitAmount;
          }
        });
      }
    });

    const tipPerPerson = tipAmount / people.length;
    newPeople.forEach(person => {
      person.total += tipPerPerson;
    });

    setPeople(newPeople);
  };

  const handleRemovePerson = (id: number) => {
    if (people.length > 1) {
      setPeople(people.filter(person => person.id !== id));
      setItems(items.map(item => ({
        ...item,
        assignedTo: item.assignedTo.filter(personId => personId !== id),
      })));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.totalsCard}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>
          
          <View style={styles.totalsRow}>
            <View style={styles.tipContainer}>
              <Text style={styles.totalLabel}>Tip:</Text>
              <View style={styles.tipInputContainer}>
                <TextInput
                  value={String(tipPercentage)}
                  onChangeText={handleTipPercentageChange}
                  keyboardType="numeric"
                  style={styles.tipInput}
                />
                <Text style={styles.tipPercentage}>%</Text>
              </View>
            </View>
            <Text style={styles.totalValue}>${tipAmount.toFixed(2)}</Text>
          </View>

          <View style={[styles.totalsRow, styles.totalFinal]}>
            <Text style={[styles.totalLabel, styles.totalLabelFinal]}>Total:</Text>
            <Text style={[styles.totalValue, styles.totalValueFinal]}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>People</Text>
            <TouchableOpacity
              onPress={handleAddPerson}
              style={styles.addButton}
            >
              <Text style={styles.buttonText}>Add Person</Text>
            </TouchableOpacity>
          </View>

          {people.map(person => (
            <View key={person.id} style={styles.personCard}>
              <TextInput
                value={person.name}
                onChangeText={(text) => handlePersonNameChange(person.id, text)}
                style={styles.personInput}
                placeholder="Enter name"
              />
              <Text style={styles.splitText}>
                Equal split: ${person.equalSplit.toFixed(2)}
              </Text>
              <Text style={styles.splitText}>
                Current total: ${person.total.toFixed(2)}
              </Text>
              {people.length > 1 && (
                <TouchableOpacity
                  onPress={() => handleRemovePerson(person.id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <TextInput
                  value={item.name}
                  onChangeText={(text) => handleItemNameChange(item.id, text)}
                  style={styles.itemNameInput}
                  placeholder="Item name"
                />
              </View>
              <View style={styles.itemDetails}>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Quantity:</Text>
                  <TextInput
                    value={editingQuantity[item.id]}
                    onChangeText={(text) => handleItemQuantityChange(item.id, text)}
                    keyboardType="numeric"
                    style={styles.itemDetailInput}
                    selectTextOnFocus={true}
                  />
                </View>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Price:</Text>
                  <TextInput
                    value={editingPrice[item.id]}
                    onChangeText={(text) => handleItemPriceChange(item.id, text)}
                    keyboardType="numeric"
                    style={styles.itemDetailInput}
                    placeholder="0.00"
                    selectTextOnFocus={true}
                  />
                </View>
                <View style={styles.itemDetailRow}>
                  <Text style={styles.itemDetailLabel}>Total:</Text>
                  <Text style={styles.itemDetailValue}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
              <View style={styles.assignmentContainer}>
                <Text style={styles.assignmentLabel}>Assign to:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {people.map(person => (
                    <TouchableOpacity
                      key={person.id}
                      onPress={() => handleItemAssignment(item.id, person.id)}
                      style={[
                        styles.assignButton,
                        item.assignedTo.includes(person.id) && styles.assignButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.assignButtonText,
                          item.assignedTo.includes(person.id) && styles.assignButtonTextActive,
                        ]}
                      >
                        {person.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.calculateButton}
          onPress={calculateSplitTotals}
        >
          <Text style={styles.calculateButtonText}>Calculate Split</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    padding: 16,
  },
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  tipInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 4,
    width: 50,
    textAlign: 'center',
  },
  tipPercentage: {
    marginLeft: 4,
    color: '#666',
  },
  totalFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4F46E5',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  personCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  personInput: {
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 8,
    marginBottom: 12,
  },
  splitText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  removeButton: {
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemNameInput: {
    fontSize: 16,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDetailLabel: {
    fontSize: 14,
    color: '#666',
    width: 70,
  },
  itemDetailInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 4,
    marginLeft: 8,
  },
  itemDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  assignmentContainer: {
    marginTop: 8,
  },
  assignmentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  assignButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  assignButtonActive: {
    backgroundColor: '#4F46E5',
  },
  assignButtonText: {
    color: '#666',
  },
  assignButtonTextActive: {
    color: '#fff',
  },
  calculateButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SplitBill;
