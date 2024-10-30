import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
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

const MAX_IMAGE_SIZE = 1024 * 1024 * 4; // 4MB en bytes

const Upload = ({ navigation }: Props) => {
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<string>('checking');

  const checkServerStatus = useCallback(async () => {
    try {
      console.log('Checking server status at:', `${API_URL}/health`);
      const response = await axios.get(`${API_URL}/health`, { 
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('Server health check response:', response.data);
      
      if (!response.data.geminiKey || response.data.geminiKey === 'missing') {
        setServerStatus('error');
        Alert.alert(
          'Configuration Error',
          'The server is missing required API keys. Please contact support.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setServerStatus('connected');
    } catch (error) {
      console.error('Server health check failed:', error);
      setServerStatus('disconnected');
      Alert.alert(
        'Server Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: checkServerStatus },
          { text: 'OK' }
        ]
      );
    }
  }, []);

  useEffect(() => {
    checkServerStatus();
    
    // Configurar intervalo de verificación
    const interval = setInterval(checkServerStatus, 30000); // Cada 30 segundos
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  const optimizeImage = async (uri: string): Promise<ImageInfo> => {
    try {
      console.log('Starting image optimization');
      
      // Primero, intenta con una compresión moderada
      let manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1500 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      // Verificar tamaño del base64
      let imageSize = manipResult.base64 ? (manipResult.base64.length * 3) / 4 : 0;
      console.log('Initial image size:', (imageSize / 1024 / 1024).toFixed(2), 'MB');

      // Si la imagen sigue siendo muy grande, comprimir más
      if (imageSize > MAX_IMAGE_SIZE) {
        console.log('Image too large, attempting further compression');
        manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1000 } }],
          {
            compress: 0.6,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );
        
        imageSize = manipResult.base64 ? (manipResult.base64.length * 3) / 4 : 0;
        console.log('Compressed image size:', (imageSize / 1024 / 1024).toFixed(2), 'MB');
      }

      if (imageSize > MAX_IMAGE_SIZE) {
        throw new Error('Image too large even after compression');
      }

      console.log('Image optimization successful');
      return {
        uri: manipResult.uri,
        base64: manipResult.base64,
        mimeType: 'image/jpeg'
      };
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw new Error('Failed to optimize image');
    }
  };

  const handleImageSelection = async (
    imagePickerFn: () => Promise<ImagePicker.ImagePickerResult>
  ) => {
    try {
      const result = await imagePickerFn();

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        const optimizedImage = await optimizeImage(result.assets[0].uri);
        setImage(optimizedImage);
      }
    } catch (error: any) {
      console.error('Error handling image:', error);
      Alert.alert(
        'Error',
        error.message === 'Image too large even after compression'
          ? 'The image is too large. Please try a smaller image or take a new photo.'
          : 'Failed to process image. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required', 
        'We need access to your photos to continue.',
        [
          { text: 'Cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() 
          }
        ]
      );
      return;
    }

    await handleImageSelection(() => 
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: false,
      })
    );
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your camera to continue.',
        [
          { text: 'Cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings() 
          }
        ]
      );
      return;
    }

    await handleImageSelection(() =>
      ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
        base64: false,
      })
    );
  };

  const handleSubmit = async () => {
    if (!image?.base64) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setLoading(true);

    try {
      console.log('Starting receipt processing');
      const response = await axios.post(
        `${API_URL}/api/process-receipt`,
        {
          imageData: `data:image/jpeg;base64,${image.base64}`,
          mimeType: image.mimeType
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      console.log('Receipt processing response status:', response.status);

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
      console.error('Receipt processing error:', error.response || error);
      
      let errorMessage = 'Failed to process the receipt. Please try again.';
      let retryAction = null;

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        
        if (responseData?.details) {
          errorMessage = responseData.details;
        } else if (error.response?.status === 400) {
          errorMessage = 'The image could not be processed. Please try another image or take a clearer photo.';
        } else if (error.response?.status === 413) {
          errorMessage = 'The image is too large. Please try again with a smaller image.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'The request timed out. Please try again with a clearer image.';
        } else if (error.code === 'ERR_NETWORK') {
          errorMessage = 'Network connection error. Please check your internet connection.';
          retryAction = checkServerStatus;
        }

        // Si la API key no está configurada
        if (responseData?.geminiConfigured === false) {
          errorMessage = 'The server is missing required API configuration. Please contact support.';
        }
      }

      Alert.alert(
        'Error',
        errorMessage,
        retryAction ? [
          { text: 'Retry', onPress: retryAction },
          { text: 'OK' }
        ] : undefined
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {serverStatus === 'checking' && (
        <View style={styles.statusBanner}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={styles.statusText}>Checking server connection...</Text>
        </View>
      )}
      
      {serverStatus === 'disconnected' && (
        <TouchableOpacity 
          style={[styles.statusBanner, { backgroundColor: '#FEE2E2' }]} 
          onPress={checkServerStatus}
        >
          <Icon name="alert-circle" size={20} color="#DC2626" />
          <Text style={[styles.statusText, { color: '#DC2626' }]}>
            Server disconnected - Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      {serverStatus === 'error' && (
        <View style={[styles.statusBanner, { backgroundColor: '#FEE2E2' }]}>
          <Icon name="alert-triangle" size={20} color="#DC2626" />
          <Text style={[styles.statusText, { color: '#DC2626' }]}>
            Server configuration error
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            styles.cameraButton,
            (loading || serverStatus !== 'connected') && styles.buttonDisabled
          ]} 
          onPress={takePhoto}
          disabled={loading || serverStatus !== 'connected'}
        >
          <Icon name="camera" size={24} color="#fff" />
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.uploadButton,
            (loading || serverStatus !== 'connected') && styles.buttonDisabled
          ]} 
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
          <Text style={styles.loadingText}>
            {image ? 'Processing receipt...' : 'Processing image...'}
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
