import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const FeatureCard = ({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) => {
  return (
    <View style={styles.card}>
      <Icon name={icon} size={48} color="#4F46E5" style={styles.icon} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
};

const Home: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Restaurant Bill Splitter</Text>
        <Text style={styles.subtitle}>
          Split your restaurant bills easily and fairly with our smart bill processing system.
        </Text>
        
        <View style={styles.featuresContainer}>
          <FeatureCard
            icon="upload"
            title="Upload Receipt"
            description="Simply upload a photo of your receipt to get started."
          />
          <FeatureCard
            icon="dollar-sign"
            title="Automatic Extraction"
            description="Our system will extract all the details from your receipt."
          />
          <FeatureCard
            icon="users"
            title="Fair Splitting"
            description="Easily split the bill among friends with just a few clicks."
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Upload')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    color: '#4B5563',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1F2937',
  },
  cardDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4B5563',
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Home;
