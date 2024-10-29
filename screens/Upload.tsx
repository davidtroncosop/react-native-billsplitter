import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Icon from 'react-native-vector-icons/Feather';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { API_URL } from '../config';

type RootStackParamList = {
  Home: undefined;
  Upload: undefined;
  SplitBill: { billData: any };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Upload'>;

interface ImageInfo {
  uri: string;
  base64?: string;
  mimeType?: string;
}

const Upload = ({ navigation }: Props) => {
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<string>('checking');

  // Check server connectivity on component mount
  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      console.log('Checking server status at:', `${API_URL}/health`);
      const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      console.log('Server health check response:', response.data);
      setServerStatus('connected');
    } catch (error) {
      console.error('Server health check failed:', error);
      setServerStatus('disconnected');
      Alert.alert(
        'Server Connection Error',
        'Unable to connect to the server. Please ensure the server is running.'
      );
    }
  };

  const processImage = async (uri: string): Promise<ImageInfo> => {
    try {
      console.log('Processing image:', uri);
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1500, height: 2000 } }],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      console.log('Image processed successfully');
      return {
        uri: manipResult.uri,
        base64: manipResult.base64,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const processedImage = await processImage(result.assets[0].uri);
        setImage(processedImage);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const processedImage = await processImage(result.assets[0].uri);
        setImage(processedImage);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleSubmit = async () => {
    if (!image?.base64) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    if (serverStatus !== 'connected') {
      Alert.alert('Error', 'Server is not connected. Please try again later.');
      return;
    }

    setLoading(true);

    try {
      console.log('Sending request to:', `${API_URL}/api/process-receipt`);
      const response = await axios.post(
        `${API_URL}/api/process-receipt`,
        {
          imageData: image.base64,
          mimeType: image.mimeType || 'image/jpeg'
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      console.log('Server response:', response.data);

      if (response.data?.success) {
        await AsyncStorage.setItem(
          'extractedBillData',
          JSON.stringify(response.data.data)
        );
        navigation.navigate('SplitBill', { billData: response.data.data });
      } else {
        throw new Error(response.data?.error || 'Failed to process receipt');
      }
    } catch (error: any) {
      console.error('Error details:', error.response || error);
      
      let errorMessage = 'Failed to process the receipt. Please try again.';
      
      if (error.response?.status === 400) {
        errorMessage = 'Invalid image data. Please try another image.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error processing the receipt. Please try again later.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again with a clearer image.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection and try again.';
        // Trigger a server status check
        checkServerStatus();
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {serverStatus === 'checking' && (
        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>Checking server connection...</Text>
        </View>
      )}
      {serverStatus === 'disconnected' && (
        <TouchableOpacity 
          style={styles.statusBanner} 
          onPress={checkServerStatus}
        >
          <Text style={styles.statusText}>Server disconnected - Tap to retry</Text>
        </TouchableOpacity>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={takePhoto}
          disabled={loading || serverStatus !== 'connected'}
        >
          <Icon name="camera" size={24} color="#fff" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={pickImage}
          disabled={loading || serverStatus !== 'connected'}
        >
          <Icon name="image" size={24} color="#fff" />
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: image.uri }}
            style={styles.preview}
            resizeMode="contain"
          />
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Processing receipt...</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!image || loading || serverStatus !== 'connected') && styles.buttonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!image || loading || serverStatus !== 'connected'}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Processing...' : 'Process Receipt'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  statusBanner: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    marginBottom: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  previewContainer: {
    flex: 1,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4F46E5',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default Upload;
