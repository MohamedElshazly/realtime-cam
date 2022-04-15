import React, {useState, useEffect} from 'react';
import {
  ActivityIndicator,
  Text,
  View,
  ScrollView,
  StyleSheet,
  Button,
  TouchableOpacity,
  Platform,
  Dimensions, 
} from 'react-native';
import {Camera} from 'expo-camera';

import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {cameraWithTensors} from '@tensorflow/tfjs-react-native';



export default function App() {

  
  
  const [predictionClass, setPredictionClass] = useState('');
  const [predictionFound, setPredictionFound] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);

  //Tensorflow and Permissions
  const [mobilenetModel, setMobilenetModel] = useState(null);
  const [frameworkReady, setFrameworkReady] = useState(false);

  const TensorCamera = cameraWithTensors(Camera);
  let requestAnimationFrameId = 0;

  //performance hacks (Platform dependent)
  const textureDims =
    Platform.OS === 'ios'
      ? {width: 1080, height: 1920}
      : {width: 1600, height: 1200};
  const tensorDims = {width: 152, height: 200};

  useEffect(() => {
    if (!frameworkReady) {
      (async () => {
        //check permissions
        const {status} = await Camera.requestCameraPermissionsAsync();
        console.log(`permissions status: ${status}`);
        setHasPermission(status === 'granted');

        //we must always wait for the Tensorflow API to be ready before any TF operation...
        await tf.ready();

        //load the mobilenet model and save it in state
        setMobilenetModel(await loadMobileNetModel());
        
        setFrameworkReady(true);
      })();
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestAnimationFrameId);
    };
  }, [requestAnimationFrameId]);

  const loadMobileNetModel = async () => {
    const model = await mobilenet.load();
    return model;
  };

  const getPrediction = async tensor => {
    if (!tensor) {
      return;
    }

    //topk set to 1
    const prediction = await mobilenetModel.classify(tensor, 1);
    console.log(`prediction: ${JSON.stringify(prediction)}`);

    if (!prediction || prediction.length === 0) {
      return;
    }

    //only attempt translation when confidence is higher than 20%
    if (prediction[0].probability > 0.2) {
      //stop looping!
      cancelAnimationFrame(requestAnimationFrameId);
      setPredictionFound(true);
      setPredictionClass(prediction[0].className);
    }
  };

  const handleCameraStream = imageAsTensors => {
    const loop = async () => {
      const nextImageTensor = await imageAsTensors.next().value;
      await getPrediction(nextImageTensor);
      requestAnimationFrameId = requestAnimationFrame(loop);
    };
    if (!predictionFound) {
      loop();
    }
  };

  const loadNewPrediction = () => {
    setPredictionFound(false);
    setPredictionClass('');
  };

  const showPredictionView = () => {
    console.log(predictionClass)
    return (
      <View style={styles.translationView}>
        {predictionFound ? (
          <View>
            <ScrollView style={{height: 400}}>
              <Text style={styles.wordTextField}>{predictionClass}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.btn}
              onPress={() => loadNewPrediction()}
            >
            <Text style={styles.btnText}>Check new predictions</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ActivityIndicator size="large" />
        )}
      </View>
    );
  };
  const renderCameraView = () => {
    return (
      <View style={styles.cameraView}>
        <TensorCamera
          style={styles.camera}
          type={Camera.Constants.Type.back}
          zoom={0}
          cameraTextureHeight={textureDims.height}
          cameraTextureWidth={textureDims.width}
          resizeHeight={tensorDims.height}
          resizeWidth={tensorDims.width}
          resizeDepth={3}
          onReady={imageAsTensors => handleCameraStream(imageAsTensors)}
          autorender={true}
        />
        <Text style={styles.legendTextField}>
          Point to any object and get its label
        </Text>
        
      </View>
    );
  };

  return (
    
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CamZ</Text>
      </View>

      <View style={styles.body}>
      {mobilenetModel ? predictionFound ? showPredictionView() : renderCameraView() : <Text style={styles.loading}>Model is still Loading!</Text>}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 40,
    backgroundColor: '#8f74d1',
  },
  header: {
    backgroundColor: '#8f74d1',
  },
  title: {
    margin: 10,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#f7f7f8',
  },
  body: {
    padding: 5,
    paddingTop: 25,
  },
  cameraView: {
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    // alignItems: 'flex-end',
    width: '100%',
    height: '100%',
    paddingTop: 10,
  },
  camera: {
    width: 700/2 ,
    height: 800/2 ,
    zIndex: 1,
    borderWidth: 0,
    borderRadius: 0,
  },
  translationView: {
    marginTop: 30,
    padding: 20,
    borderColor: '#cccccc',
    borderWidth: 1,
    borderStyle: 'solid',
    // backgroundColor: '#7b2864',
    backgroundColor: '#e0d9eb',
    marginHorizontal: 20,
    height: 500,
  },
  translationTextField: {
    fontSize: 60,
  },
  wordTextField: {
    textAlign: 'center',
    fontSize: 22,
    paddingTop: '60%',
    color: '#7b2864'
  },
  legendTextField: {
    fontStyle: 'italic',
    color: '#000',
    fontSize: 20,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'purple',
    borderStyle: 'solid',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
    backgroundColor: '#ffffff',
  },
  loading: {
    fontSize: 20, 
    textAlign: 'center',
    paddingTop: '55%',
    color: '#f7f7f8'
    // textAlignVertical: 'center'
  },
  btn : {
    backgroundColor:'#7b2864',
    // color: '#7b2864',
    padding: 10,
    alignItems: 'center', 
  },
  btnText: {
    color: '#f7f7f8'
  }
});

