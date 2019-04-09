
const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  waveColor: 'blue',
  progressColor: 'lightblue'
});
wavesurfer.on('ready', function() {
  document.querySelector("div#wavesurfer-controls").style="display: block";
})

var saveFileButton = document.getElementById("saveAudio");
saveFileButton.onclick = function(ev) {
  let graphData = document.getElementById('myChart').data;
  console.log(graphData)
};


var audioPlayPauseButton = document.getElementById("audio_playpause");
audioPlayPauseButton.onclick = function(ev) {
  if (wavesurfer.isPlaying()) {
    audioPlayPauseButton.innerText = "Play"
  } else {
    audioPlayPauseButton.innerText = "Pause"
  }
  wavesurfer.playPause()
}

function ab2str(buf) {
  return btoa(
    new Uint8Array(arrayBuffer)
    .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

let ws = new WebSocket("ws://127.0.0.1:8080/")
ws.onopen = function() {
  ws.send('{"key":"msg","value":"socket open!"}');
}

function sliderTooltip(event, ui) {
    var curValue = ui.value || 0;
    var tooltip = '<div class="tooltip"><div class="tooltip-inner">' + curValue + '</div><div class="tooltip-arrow"></div></div>';
    $('.ui-slider-handle').html(tooltip);
}

$("#slider").slider({
  value: 0,
  min: -1000,
  max: 1000,
  step: 100,
  create: sliderTooltip,
  slide: sliderTooltip
});

$("#slider").on("slidestop", function(event, ui) {
  const sliderPos = ui.value;
  ws.send(JSON.stringify({key: 'wav_file_change_pitch', value: sliderPos}));
  $("#slider").slider('value', 0)
  sliderTooltip(null, {value: 0})
})

function sliderTooltip(event, ui) {
    var curValue = ui.value || 0;
    var tooltip = '<div class="tooltip"><div class="tooltip-inner">' + curValue + '</div><div class="tooltip-arrow"></div></div>';
    $('.ui-slider-handle').html(tooltip);
}

$("#slider2").slider({
  value: 0,
  min: 0,
  max: 100,
  step: 1,
  create: sliderTooltip,
  slide: sliderTooltip
});

$("#slider2").on("slidestop", function(event, ui) {
  const slider2Pos = ui.value;
  ws.send(JSON.stringify({key: 'wav_file_volume', value: slider2Pos}));
  $("#slider").slider('value', 0)
  sliderTooltip(null, {value: 0})
})

ws.onmessage = function (evt) {
  const message = JSON.parse(evt.data)

  if (message.key == "wave_data") {
    const [audioBytes, freqPlotBytes] = message.value

    const audioBlob = new Blob([str2ab(atob(audioBytes))], {type: "audio/wav"})
    wavesurfer.loadBlob(audioBlob)

    const freqPlotData = JSON.parse(freqPlotBytes)
    const plotTrace = {
      y: freqPlotData,
      type: 'line'
    }

    const plotLayout = {
      hovermode:'closest',
      title:'Frequency Spectrum (Click to remove frequency)'
    }

    Plotly.newPlot('myChart', [plotTrace], plotLayout)

    document.getElementById('myChart').on('plotly_click', function(ev){
      let removePoint = ev.points[0].pointIndex;
      console.log("removing:",removePoint)
      ws.send(JSON.stringify({key: 'wav_file_freq_remove', value: removePoint}));
    })
  }
}


let filereader = new FileReader();
filereader.onload = function(ev) {
  let arrayBuffer = filereader.result;

  let wavFileBytes = btoa(
    new Uint8Array(arrayBuffer)
    .reduce((data, byt) => data + String.fromCharCode(byt), '')
  );

  ws.send(JSON.stringify({key: 'new_wav_file', value: wavFileBytes}))
}

let wavFileInput = document.querySelector('input[name="wav_file"]');
wavFileInput.onchange = function(event) {
  const file = event.target.files[0];
  filereader.readAsArrayBuffer(file);
}
