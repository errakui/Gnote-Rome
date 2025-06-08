import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import cryptoService from '../services/crypto';



interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const isEncrypted = cryptoService.isEnabled();

  const handleLogout = async () => {
    try {
      // Cancella la chiave di crittografia
      await cryptoService.clear();
      
      // Torna alla schermata di login
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={styles.header}>
        <Image source={require('../assets/GLOGO.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.headerRight}>
          <View style={styles.userInfo}>
            <Text style={styles.userText}>USER: {}</Text>
            {isEncrypted && (
              <View style={styles.encryptBadge}>
                <Text style={styles.encryptText}>AES-256</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutIcon}>⏏</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>BENVENUTO IN GHUB</Text>

        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('Notes')}
            activeOpacity={0.7}
          >
            <Image source={require('../assets/note.png')} style={styles.cardImage} resizeMode="contain" />
            <Text style={styles.cardTitle}>NOTE</Text>
            <Text style={styles.cardDescription}>
              Crea, visualizza e gestisci le tue note
            </Text>
            <TouchableOpacity 
              style={styles.cardButton}
              onPress={() => navigation.navigate('Notes')}
            >
              <Text style={styles.cardButtonText}>Accedi alle note</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('Gallery')}
            activeOpacity={0.7}
          >
            <Image source={require('../assets/galleria.png')} style={styles.cardImage} resizeMode="contain" />
            <Text style={styles.cardTitle}>GALLERIA</Text>
            <Text style={styles.cardDescription}>
              Gestisci, visualizza e organizza le tue immagini
            </Text>
            <TouchableOpacity 
              style={styles.cardButton}
              onPress={() => navigation.navigate('Gallery')}
            >
              <Text style={styles.cardButtonText}>Accedi alla galleria</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ghub v1.0 {isEncrypted ? "- Crittografia AES-256 Attiva" : ""}
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
  logo: {
    height: 40,
    width: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  userText: {
    color: '#999',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginRight: 6,
  },
  encryptBadge: {
    backgroundColor: '#085',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  encryptText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logoutButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  logoutIcon: {
    fontSize: 18,
    color: '#999',
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardsContainer: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cardImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
});

export default HomeScreen; 