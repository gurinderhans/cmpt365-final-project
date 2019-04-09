import asyncio
import datetime
import random
import websockets
import json
import base64
import sys
import io
from scipy.io.wavfile import read, write
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg') # Force matplotlib to not use any Xwindows backend

Current_Wav_File=None

async def time(websocket, path):

  global Current_Wav_File;

  async for message in websocket:
    
    jmsg = json.loads(message)
    print("request key:", jmsg['key'])

    if jmsg["key"] == "new_wav_file":

      wavFileBytes = io.BytesIO(base64.b64decode(jmsg["value"]))

      Current_Wav_File = read(wavFileBytes)

      rate, arr = Current_Wav_File

      datafft = np.fft.fft(arr)
      freqPlotData = np.abs(datafft)
      freqPlotDataStr = json.dumps(freqPlotData.tolist())

      newBytesb64 = base64.b64encode(wavFileBytes.getvalue()).decode('utf-8')

      await websocket.send(json.dumps({
        "key":"wave_data", 
        "value": [newBytesb64, freqPlotDataStr]
      }))

    elif jmsg["key"] == "wav_file_freq_remove":
      rate, arr = Current_Wav_File
      datafft = np.fft.fft(arr)
      datafft[jmsg["value"]] = 0

      recovered_signal = np.fft.ifft(datafft).astype('int16')

      Current_Wav_File = rate, recovered_signal

      freqPlotData = np.abs(datafft)
      freqPlotDataStr = json.dumps(freqPlotData.tolist())

      moddedBytes = io.BytesIO()
      write(moddedBytes, rate, recovered_signal)

      newBytesb64 = base64.b64encode(moddedBytes.getvalue()).decode('utf-8')

      await websocket.send(json.dumps({
        "key":"wave_data", 
        "value": [newBytesb64, freqPlotDataStr]
      }))
    
    elif jmsg["key"] == "wav_file_change_pitch":
      rate, arr = Current_Wav_File
      datafft = np.fft.fft(arr)
      print(jmsg["value"], type(jmsg["value"]))
      datafft = np.roll(datafft, jmsg["value"])

      recovered_signal = np.fft.ifft(datafft).astype('int16')

      Current_Wav_File = rate, recovered_signal

      freqPlotData = np.abs(datafft)
      freqPlotDataStr = json.dumps(freqPlotData.tolist())

      moddedBytes = io.BytesIO()
      write(moddedBytes, rate, recovered_signal)

      newBytesb64 = base64.b64encode(moddedBytes.getvalue()).decode('utf-8')

      await websocket.send(json.dumps({
        "key":"wave_data", 
        "value": [newBytesb64, freqPlotDataStr]
      }))


start_server = websockets.serve(time, '0.0.0.0', 8080)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
