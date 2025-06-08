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
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import cryptoService from '../services/crypto';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

interface NotesScreenProps {
  navigation: any;
}

const NotesScreen: React.FC<NotesScreenProps> = ({navigation}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  


  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const userIdStr = await AsyncStorage.getItem('userId');
      if (!userIdStr) {
        navigation.reset({
          index: 0,
          routes: [{name: 'Login'}],
        });
        return;
      }

      const userId = parseInt(userIdStr);
      const userNotes = await api.getNotes(userId);
      
      // Decripta i titoli e contenuti
      const decryptedNotes = await Promise.all(
        userNotes.map(async (note: any) => ({
          ...note,
          title: await cryptoService.decrypt(note.title),
          content: await cryptoService.decrypt(note.content),
        }))
      );
      
      setNotes(decryptedNotes);
    } catch (error) {
      console.error('Errore nel caricamento delle note:', error);
      Alert.alert('Errore', 'Impossibile caricare le note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim()) {
      Alert.alert('Errore', 'Il titolo non può essere vuoto');
      return;
    }

    try {
      const userIdStr = await AsyncStorage.getItem('userId');
      if (!userIdStr) return;
      
      const userId = parseInt(userIdStr);
      
      // Cripta titolo e contenuto vuoto
      const encryptedTitle = await cryptoService.encrypt(noteTitle);
      const encryptedContent = await cryptoService.encrypt('');
      
      // Crea la nota tramite API
      const newNote = await api.createNote(userId, encryptedTitle, encryptedContent);
      
      if (newNote) {
        // Aggiungi la nota decriptata alla lista
        const decryptedNote = {
          ...newNote,
          title: noteTitle,
          content: '',
        };
        
        setNotes([decryptedNote, ...notes]);
        setNoteTitle('');
        setIsModalVisible(false);
        
        // Vai alla schermata di dettaglio della nota appena creata
        navigation.navigate('NoteDetail', {note: decryptedNote, isNew: true});
      }
    } catch (error) {
      console.error('Errore nella creazione della nota:', error);
      Alert.alert('Errore', 'Impossibile creare la nota');
    }
  };

  const handleNotePress = (note: Note) => {
    navigation.navigate('NoteDetail', {note, isNew: false});
  };

  const renderNoteItem = ({item}: {item: any}) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() => handleNotePress(item)}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle}>{item.title}</Text>
        <Text style={styles.noteDate}>
          {new Date(item.updated_at || item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.notePreview} numberOfLines={2}>
        {item.content.substring(0, 100)}
        {item.content.length > 100 ? '...' : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTE</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Caricamento note...</Text>
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nessuna nota</Text>
          <Text style={styles.emptySubtext}>
            Premi + per creare la tua prima nota
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.notesList}
        />
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nuova Nota</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Titolo della nota"
              placeholderTextColor="#666"
              value={noteTitle}
              onChangeText={setNoteTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNoteTitle('');
                  setIsModalVisible(false);
                }}>
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleAddNote}>
                <Text style={styles.createButtonText}>Crea</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  notesList: {
    padding: 16,
  },
  noteItem: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  notePreview: {
    fontSize: 14,
    color: '#999',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalInput: {
    backgroundColor: '#222',
    borderRadius: 4,
    padding: 12,
    color: '#fff',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  createButton: {
    backgroundColor: '#fff',
  },
  createButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default NotesScreen; 