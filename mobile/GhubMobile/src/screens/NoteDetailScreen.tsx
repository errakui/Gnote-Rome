import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import cryptoService from '../services/crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Note {
  id: number;
  title: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

interface NoteDetailScreenProps {
  navigation: any;
  route: {
    params: {
      note: Note;
      isNew: boolean;
    };
  };
}

const NoteDetailScreen: React.FC<NoteDetailScreenProps> = ({navigation, route}) => {
  const {note: initialNote, isNew} = route.params;
  
  const [note, setNote] = useState<Note>({...initialNote});
  const [title, setTitle] = useState(initialNote.title);
  const [content, setContent] = useState(initialNote.content);
  const [isEditing, setIsEditing] = useState(isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    // Imposta il titolo della schermata di navigazione
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (initialNote.id) {
      loadNote();
    }
  }, [initialNote.id]);

  // Auto-save ogni 30 secondi
  useEffect(() => {
    const timer = setInterval(() => {
      if (title || content) {
        handleSave(true);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [title, content]);

  const loadNote = async () => {
    setLoading(true);
    try {
      const userIdStr = await AsyncStorage.getItem('userId');
      if (!userIdStr) return;
      
      const userId = parseInt(userIdStr);
      const notes = await api.getNotes(userId);
      const foundNote = notes.find((n: any) => n.id === initialNote.id);
      
      if (foundNote) {
        const decryptedTitle = foundNote.title.startsWith('ENC:')
          ? await cryptoService.decrypt(foundNote.title) 
          : foundNote.title;
        const decryptedContent = foundNote.content.startsWith('ENC:')
          ? await cryptoService.decrypt(foundNote.content) 
          : foundNote.content;
        
        setTitle(decryptedTitle);
        setContent(decryptedContent);
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile caricare la nota');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isAutoSave = false) => {
    if (!title && !content) {
      if (!isAutoSave) {
        Alert.alert('Errore', 'La nota è vuota');
      }
      return;
    }

    setIsSaving(true);
    try {
      const userIdStr = await AsyncStorage.getItem('userId');
      if (!userIdStr) return;
      
      const userId = parseInt(userIdStr);
      const encryptedTitle = await cryptoService.encrypt(title || 'Senza titolo');
      const encryptedContent = await cryptoService.encrypt(content);

      if (initialNote.id) {
        await api.updateNote(initialNote.id, userId, encryptedTitle, encryptedContent);
      } else {
        const newNote = await api.createNote(userId, encryptedTitle, encryptedContent);
        if (newNote) {
          // Aggiorna la navigazione con il nuovo ID
          navigation.setParams({ note: { ...initialNote, id: newNote.id } });
        }
      }
      
      setLastSaved(new Date());
      if (!isAutoSave) {
        Alert.alert('Successo', 'Nota salvata');
      }
    } catch (error) {
      if (!isAutoSave) {
      Alert.alert('Errore', 'Impossibile salvare la nota');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Elimina Nota',
      'Sei sicuro di voler eliminare questa nota?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              const userIdStr = await AsyncStorage.getItem('userId');
              if (!userIdStr) return;
              const userId = parseInt(userIdStr);
              await api.deleteNote(initialNote.id, userId);
            navigation.goBack();
            } catch (error) {
              Alert.alert('Errore', 'Impossibile eliminare la nota');
            }
          },
        },
      ]
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
          onPress={() => {
            if (isEditing && !isNew) {
              Alert.alert(
                'Conferma',
                'Vuoi annullare le modifiche?',
                [
                  {text: 'No', style: 'cancel'},
                  {
                    text: 'Sì',
                    onPress: () => navigation.goBack(),
                  },
                ],
              );
            } else {
              navigation.goBack();
            }
          }}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          {isSaving && <ActivityIndicator size="small" color="#007AFF" />}
          {lastSaved && (
            <Text style={styles.savedText}>
              Salvato alle {lastSaved.toLocaleTimeString('it-IT', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
          )}
          {!isEditing && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setIsEditing(true)}>
                <Text style={styles.actionButtonText}>Modifica</Text>
              </TouchableOpacity>
          )}
          {!isEditing && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}>
                <Text style={styles.actionButtonText}>Elimina</Text>
              </TouchableOpacity>
          )}
          {isEditing && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSave(false)}
              disabled={isSaving}>
              <Text style={styles.actionButtonText}>
                {isSaving ? 'Salvataggio...' : 'Salva'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isEditing ? (
            <>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Titolo della nota"
                placeholderTextColor="#666"
                autoCapitalize="sentences"
              />
              
              <TextInput
                style={styles.contentInput}
                value={content}
                onChangeText={setContent}
                placeholder="Inizia a scrivere qui..."
                placeholderTextColor="#666"
                multiline
                autoCapitalize="sentences"
                textAlignVertical="top"
              />
            </>
          ) : (
            <>
              <Text style={styles.titleDisplay}>{note.title}</Text>
              
              <Text style={styles.dateText}>
                Creata: {new Date(note.created_at).toLocaleDateString()}
                {note.created_at !== note.updated_at &&
                  ` • Modificata: ${new Date(note.updated_at).toLocaleDateString()}`}
              </Text>
              
              <Text style={styles.contentDisplay}>{note.content}</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Crittografia AES-256 attiva
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
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  deleteButton: {
    backgroundColor: '#933',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    padding: 0,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    padding: 0,
    textAlignVertical: 'top',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    minHeight: 300,
  },
  titleDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateText: {
    fontSize: 12,
    color: '#777',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  contentDisplay: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedText: {
    fontSize: 12,
    color: '#666',
  },
});

export default NoteDetailScreen; 