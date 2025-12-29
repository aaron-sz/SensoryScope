import { Button, Icon, ListItem, Overlay, Slider, Text } from '@rneui/themed';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../_layout';

export default function SubmitScreen() {
  const { session } = useAuth();
  const [locations, setLocations] = useState<any[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [sound, setSound] = useState(5);
  const [light, setLight] = useState(5);
  const [crowd, setCrowd] = useState(5);

  useEffect(() => {
    fetchLocations();
    // Refresh locations when screen is focused? For now on mount.
  }, []);

  const fetchLocations = async () => {
    const { data } = await supabase.from('locations').select('*');
    if (data) setLocations(data);
  };

  const findNearest = async () => {
    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permission denied', 'Need location to find nearest spot.');
        setLoading(false);
        return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    // Parse coordinates and sort by distance client-side
    const validLocations = locations.map(l => {
       let lat = 0, lon = 0;
       if (l.coords && l.coords.coordinates) {
          lon = l.coords.coordinates[0];
          lat = l.coords.coordinates[1];
       } else if (typeof l.coords === 'string') {
          // Handle WKT or other string if needed, currently assuming GeoJSON object
       }
       return { ...l, lat, lon };
    });

    validLocations.sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.lat - latitude, 2) + Math.pow(a.lon - longitude, 2));
        const distB = Math.sqrt(Math.pow(b.lat - latitude, 2) + Math.pow(b.lon - longitude, 2));
        return distA - distB;
    });

    if (validLocations.length > 0) {
        setLocationId(validLocations[0].id);
        Alert.alert('Nearest Location', `Selected: ${validLocations[0].name}`);
    } else {
        Alert.alert('No locations found');
    }
    setLoading(false);
  };

  const submitReview = async () => {
    if (!session) {
        Alert.alert('Authentication Required', 'Please sign in from the Profile tab to submit a review.');
        return;
    }
    if (!locationId) {
        Alert.alert('Select Location', 'Please select a location to review.');
        return;
    }

    setLoading(true);

    const { error } = await supabase.from('reviews').insert({
        location_id: locationId,
        user_id: session.user.id,
        sound_rating: sound,
        light_rating: light,
        crowd_rating: crowd,
        comment: '', // Optional comment
    });

    if (error) {
        Alert.alert('Submission Error', error.message);
        setLoading(false);
        return;
    }

    // Update location averages
    // Fetch all reviews for this location to recalculate
    const { data: reviews } = await supabase
        .from('reviews')
        .select('sound_rating, light_rating, crowd_rating')
        .eq('location_id', locationId);
    
    if (reviews && reviews.length > 0) {
        const count = reviews.length;
        const avgSound = reviews.reduce((acc, curr) => acc + (curr.sound_rating || 0), 0) / count;
        const avgLight = reviews.reduce((acc, curr) => acc + (curr.light_rating || 0), 0) / count;
        const avgCrowd = reviews.reduce((acc, curr) => acc + (curr.crowd_rating || 0), 0) / count;

        await supabase.from('locations').update({
            avg_sound: avgSound,
            avg_light: avgLight,
            avg_crowd: avgCrowd,
            review_count: count
        }).eq('id', locationId);
    }

    setLoading(false);
    Alert.alert('Success', 'Thank you for your contribution!');
    
    // Reset defaults
    setSound(5);
    setLight(5);
    setCrowd(5);
    setLocationId(null);
  };

  const selectedLocName = locations.find(l => l.id === locationId)?.name || 'Select Location';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text h4 style={styles.header}>Rate a Place</Text>

      <View style={styles.selectionContainer}>
         <Button 
            title={selectedLocName} 
            onPress={() => setPickerVisible(true)} 
            type="outline" 
            buttonStyle={styles.selectBtn}
            titleStyle={{color: '#333'}}
         />
         <View style={styles.orDivider}>
             <Text style={{color:'#888'}}>OR</Text>
         </View>
         <Button 
            title="Find Nearest to Me" 
            onPress={findNearest} 
            icon={{name:'location', type:'ionicon', color:'white', size: 18}} 
            buttonStyle={styles.nearestBtn}
         />
      </View>

      <View style={styles.sliderSection}>
        <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Sound Level: {sound}</Text>
            <Slider value={sound} onValueChange={setSound} maximumValue={10} minimumValue={0} step={1} thumbTintColor="#2f95dc" minimumTrackTintColor="#2f95dc" />
            <View style={styles.scaleLabels}><Text style={styles.tinyLabel}>Quiet</Text><Text style={styles.tinyLabel}>Loud</Text></View>
        </View>
        
        <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Light Level: {light}</Text>
            <Slider value={light} onValueChange={setLight} maximumValue={10} minimumValue={0} step={1} thumbTintColor="#2f95dc" minimumTrackTintColor="#2f95dc" />
            <View style={styles.scaleLabels}><Text style={styles.tinyLabel}>Dim</Text><Text style={styles.tinyLabel}>Bright</Text></View>
        </View>
        
        <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Crowd Level: {crowd}</Text>
            <Slider value={crowd} onValueChange={setCrowd} maximumValue={10} minimumValue={0} step={1} thumbTintColor="#2f95dc" minimumTrackTintColor="#2f95dc" />
            <View style={styles.scaleLabels}><Text style={styles.tinyLabel}>Empty</Text><Text style={styles.tinyLabel}>Packed</Text></View>
        </View>
      </View>

      <Button 
        title="Submit Review" 
        onPress={submitReview} 
        loading={loading} 
        disabled={loading}
        containerStyle={styles.submitContainer} 
        buttonStyle={styles.submitBtn}
      />

      <Overlay isVisible={pickerVisible} onBackdropPress={() => setPickerVisible(false)} overlayStyle={styles.overlay}>
         <View>
             <Text h4 style={{marginBottom: 15, textAlign:'center'}}>Select Location</Text>
             <ScrollView style={{maxHeight: 400}}>
                 {locations.map(l => (
                     <ListItem key={l.id} onPress={() => { setLocationId(l.id); setPickerVisible(false); }} bottomDivider containerStyle={{borderRadius: 5}}>
                         <ListItem.Content>
                             <ListItem.Title style={{fontWeight:'600'}}>{l.name}</ListItem.Title>
                             <ListItem.Subtitle style={{fontSize:12, color:'gray'}}>{l.description && l.description.substring(0,30)}</ListItem.Subtitle>
                         </ListItem.Content>
                         <Icon name="chevron-forward" type="ionicon" size={20} color="#ccc" />
                     </ListItem>
                 ))}
                 {locations.length === 0 && <Text style={{textAlign:'center', marginTop:20}}>No locations loaded.</Text>}
             </ScrollView>
             <Button title="Close" type="clear" onPress={() => setPickerVisible(false)} containerStyle={{marginTop: 10}} />
         </View>
      </Overlay>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 50, backgroundColor: '#fff' },
  header: { marginBottom: 30, textAlign: 'center', color: '#2f95dc' },
  selectionContainer: { marginBottom: 30 },
  selectBtn: { borderColor: '#ccc', borderWidth: 1, borderRadius: 10, justifyContent: 'flex-start', paddingHorizontal: 15 },
  nearestBtn: { backgroundColor: '#2f95dc', borderRadius: 10, marginTop: 5 },
  orDivider: { alignItems: 'center', marginVertical: 10 },
  sliderSection: { marginBottom: 30 },
  sliderContainer: { marginBottom: 20 },
  sliderLabel: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  tinyLabel: { fontSize: 10, color: 'gray' },
  submitContainer: { marginTop: 10 },
  submitBtn: { borderRadius: 10, paddingVertical: 12, backgroundColor: '#4caf50' },
  overlay: { width: '85%', borderRadius: 15, padding: 20 }
});
