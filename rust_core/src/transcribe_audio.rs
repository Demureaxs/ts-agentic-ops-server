// // rust_core/src/lib.rs

// // ... your existing imports and code

// use napi::{bindgen_prelude::*, Result as NapiResult};
// use napi_derive::napi;
// use std::path::Path;
// use tokio;
// use whisper_rs::{FullParams, SamplingStrategy, WhisperContext};

// // --- Your existing NAPI functions ---

// // New function for speech-to-text
// #[napi]
// pub async fn transcribe_audio(audio_path: String) -> NapiResult<String> {
//     // Defer the heavy lifting to the internal logic
//     let result = tokio::task::spawn_blocking(move || transcribe_sync(&audio_path)).await;

//     // Handle the result from the spawned thread
//     match result {
//         Ok(transcription) => transcription,
//         Err(e) => Err(Error::from_reason(format!(
//             "Transcription task failed: {}",
//             e
//         ))),
//     }
// }

// // Helper function that runs synchronously on the blocking thread
// fn transcribe_sync(audio_path: &str) -> NapiResult<String> {
//     // --- Model and context setup ---
//     // NOTE: Replace this path with the actual location of your model file.
//     // Whisper models are usually downloaded separately.
//     let model_path = Path::new("./models/ggml-base.en.bin");
//     if !model_path.exists() {
//         return Err(Error::from_reason(format!(
//             "Whisper model not found at: {:?}",
//             model_path
//         )));
//     }

//     // 1. Create the context
//     let ctx = match WhisperContext::new_with_params(
//         model_path.to_str().unwrap(),
//         whisper_rs::WhisperContextParameters {
//             use_gpu: (false),
//             flash_attn: (false),
//             gpu_device: (0),
//             dtw_parameters: Default::default(),
//         },
//     ) {
//         Ok(c) => c,
//         Err(e) => return Err(Error::from_reason(format!("Failed to load context: {}", e))),
//     };

//     // 2. Load the audio file
//     let mut reader = match hound::WavReader::open(audio_path) {
//         Ok(r) => r,
//         Err(e) => {
//             return Err(Error::from_reason(format!(
//                 "Failed to open WAV file: {}",
//                 e
//             )))
//         }
//     };

//     // Convert audio to the 16-bit PCM format expected by Whisper
//     let samples: Vec<i16> = reader.samples().filter_map(|s| s.ok()).collect();

//     // Convert i16 samples to f32 (normalized)
//     let audio_data: Vec<f32> = samples
//         .iter()
//         .map(|&s| s as f32 / 32768.0) // Normalize
//         .collect();

//     // 3. Create a state
//     let mut state = match ctx.create_state() {
//         Ok(s) => s,
//         Err(e) => return Err(Error::from_reason(format!("Failed to create state: {}", e))),
//     };

//     // 4. Set parameters and run the transcription
//     let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
//     params.set_language(Some("en"));
//     params.set_n_threads(4); // Use 4 threads for transcription

//     match state.full(params, &audio_data) {
//         Ok(_) => {
//             // 5. Get the transcribed text
//             let mut result = String::new();
//             let num_segments = state.full_n_segments();
//             for i in 0..num_segments {
//                 let segment = state.full_get_segment_text(i).unwrap();
//                 result.push_str(&segment);
//             }
//             Ok(result) // Return the transcription as a NapiResult<String>
//         }
//         Err(e) => Err(Error::from_reason(format!(
//             "Whisper full transcription failed: {}",
//             e
//         ))),
//     }
// }
