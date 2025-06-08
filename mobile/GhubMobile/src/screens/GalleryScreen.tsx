import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import cryptoService from '../services/crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dimensioni per le immagini della griglia
const {width} = Dimensions.get('window');
const numColumns = 3;
const itemSize = (width - 48) / numColumns; // 3 colonne con padding

interface GalleryItem {
  id: string;
  noteId: string;
  filename: string;
  mimeType: string;
  data: string;
  createdAt: string;
}

interface GalleryScreenProps {
  navigation: any;
}

const GalleryScreen: React.FC<GalleryScreenProps> = ({navigation}) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGalleryItems();
  }, []);

  const loadGalleryItems = async () => {
    setLoading(true);
    try {
      const userIdStr = await AsyncStorage.getItem('userId');
      if (!userIdStr) {
        navigation.reset({
          index: 0,
          routes: [{name: 'Login'}],
        });
        return;
      }

      const userId = parseInt(userIdStr);
      const galleryItems = await api.getGalleryItems(userId);
      
      // Decripta i dati se necessario
      const decryptedItems = await Promise.all(
        galleryItems.map(async (item: any) => ({
          ...item,
          data: item.data.startsWith('ENC:')
            ? await cryptoService.decryptFile(item.data)
            : item.data,
        }))
      );
      
      setItems(decryptedItems);
    } catch (error) {
      console.error('Errore nel caricamento della galleria:', error);
      Alert.alert('Errore', 'Impossibile caricare la galleria');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePress = (item: GalleryItem) => {
    // Visualizza l'immagine a schermo intero o naviga a una schermata di dettaglio
    Alert.alert('Media', item.filename);
  };

  const handleAddImage = () => {
    // Implementazione per aggiungere una nuova immagine
    // Qui useremmo un image picker o la fotocamera
    Alert.alert(
      'Funzionalità in arrivo',
      'L\'aggiunta di immagini sarà disponibile nella prossima versione',
    );
  };

  const renderItem = ({item}: {item: GalleryItem}) => {
    const isVideo = item.mimeType.startsWith('video/');
    
    return (
    <TouchableOpacity
        style={styles.gridItem}
      onPress={() => handleImagePress(item)}>
        {isVideo ? (
          <View style={styles.videoContainer}>
            <Text style={styles.videoIcon}>▶️</Text>
            <Text style={styles.filename} numberOfLines={1}>
              {item.filename}
      </Text>
          </View>
        ) : (
          <Image
            source={{uri: `data:${item.mimeType};base64,${item.data}`}}
            style={styles.image}
            resizeMode="cover"
          />
        )}
    </TouchableOpacity>
  );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GALLERIA</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddImage}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nessun media nella galleria</Text>
          <Text style={styles.emptySubtext}>
              Aggiungi foto e video dalle tue note
          </Text>
        </View>
        }
        />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Le immagini sono criptate con AES-256
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: 16,
  },
  gridItem: {
    width: itemSize,
    height: itemSize,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  videoIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  filename: {
    color: 'white',
    fontSize: 10,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 12,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default GalleryScreen; 