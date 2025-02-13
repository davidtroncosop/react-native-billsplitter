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
      const response = await axios.get(`${API_URL}/health`, {
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      setServerStatus('connected');
    } catch (error) {
      setServerStatus('disconnected');
      Alert.alert(
        'Server Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.',
        [
          { text: 'Retry', onPress: checkServerStatus },
          { text: 'OK' },
        ]
      );
    }
  }, []);

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000); // Cada 30 segundos
    return () => clearInterval(interval);
  }, [checkServerStatus]);

  const optimizeImage = async (uri: string): Promise<ImageInfo> => {
    try {
      let manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1500 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      let imageSize = manipResult.base64 ? (manipResult.base64.length * 3) / 4 : 0;

      if (imageSize > MAX_IMAGE_SIZE) {
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
      }

      if (imageSize > MAX_IMAGE_SIZE) {
        throw new Error('Image too large even after compression');
      }

      return {
        uri: manipResult.uri,
        base64: manipResult.base64,
        mimeType: 'image/jpeg',
      };
    } catch (error) {
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
            onPress: () =>
              Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings(),
          },
        ]
      );
      return;
    }

    await handleImageSelection(() =>
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
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
            onPress: () =>
              Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings(),
          },
        ]
      );
      return;
    }

    await handleImageSelection(() =>
      ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
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
      const response = await axios.post(
        `${API_URL}/api/process-receipt`,
        {
          imageData: `data:image/jpeg;base64,${image.base64}`,
          mimeType: image.mimeType,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

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
      Alert.alert(
        'Error',
        error.message || 'Failed to process the receipt. Please try again.'
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
          <Text style={[styles.statusText, { marginLeft: 8 }]}>
            Checking server connection...
          </Text>
        </View>
      )}

      {serverStatus === 'disconnected' && (
        <TouchableOpacity
          style={[styles.statusBanner, { backgroundColor: '#FEE2E2' }]}
          onPress={checkServerStatus}
        >
          <Icon name="alert-circle" size={20} color="#DC2626" />
          <Text style={[styles.statusText, { color: '#DC2626', marginLeft: 8 }]}>
            Server disconnected - Tap to retry
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.cameraButton,
            (loading || serverStatus !== 'connected') && styles.buttonDisabled,
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
            (loading || serverStatus !== 'connected') && styles.buttonDisabled,
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
          <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!image || loading || serverStatus !== 'connected') && styles.buttonDisabled,
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
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  cameraButton: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  uploadButton: {
    backgroundColor: '#10B981',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
  },
  buttonDisabled: {
    backgroundColor: '#A8A8A8',
  },
  previewContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default Upload;
