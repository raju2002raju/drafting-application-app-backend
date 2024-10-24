import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Upload, Copy, Trash2, Plus, X, Printer, Mic, Square, Download } from 'lucide-react';
import { baseUrl } from '../Config';
import { v4 as uuidv4 } from 'uuid';

// AI Chat Modal Component
const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  );
};

// AI Chat Component
const AiChat = ({ isOpen, onClose, content, onUpdateContent }) => {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`${baseUrl}/api/ai-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateText: content, transcript: message })
      });

      const data = await response.json();
      // Extract the corrected text from the response
      const updatedContent = data.correctedText || data.success || '';
      onUpdateContent(updatedContent);
      onClose();
    } catch (error) {
      console.error('AI update failed:', error);
    }
    setIsProcessing(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">AI Assistant</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-700">{content}</p>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 border rounded resize-none h-32"
          placeholder="Enter your changes..."
        />

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Update'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Section Component
const Section = ({
  section,
  onDuplicate,
  onDelete,
  onAdd,
  isSelected,
  onSelect,
  isDisabled,
  onUpdateContent,
}) => {
  const [showAiChat, setShowAiChat] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  const handleAiUpdate = (updatedContent) => {
    onUpdateContent(section.id, updatedContent);
    setShowAiChat(false);
  };


  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingTime(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const wavBlob = await convertToWav(audioBlob);
        await sendAudioToBackend(wavBlob);
        stream.getTracks().forEach(track => track.stop());
        stopTimer();
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startTimer();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const convertToWav = async (webmBlob) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000  // Maintain 16kHz sample rate
    });
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create WAV file
    const wavBuffer = audioContext.createBuffer(
      1,  // Mono
      audioBuffer.length,
      16000  // 16kHz sample rate
    );

    // Copy audio data
    wavBuffer.copyToChannel(audioBuffer.getChannelData(0), 0);

    // Convert to WAV format
    const wavBlob = await new Promise(resolve => {
      const offlineContext = new OfflineAudioContext(1, wavBuffer.length, 16000);
      const source = offlineContext.createBufferSource();
      source.buffer = wavBuffer;
      source.connect(offlineContext.destination);
      source.start();

      offlineContext.startRendering().then(renderedBuffer => {
        const wav = new Blob([createWaveFileData(renderedBuffer)], { type: 'audio/wav' });
        resolve(wav);
      });
    });

    return wavBlob;
  };

  const createWaveFileData = (audioBuffer) => {
    const frameLength = audioBuffer.length;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numberOfChannels * bitsPerSample / 8;
    const blockAlign = numberOfChannels * bitsPerSample / 8;
    const wavDataByteLength = frameLength * numberOfChannels * 2;
    const headerByteLength = 44;
    const totalLength = headerByteLength + wavDataByteLength;
    const waveFileData = new Uint8Array(totalLength);
    const view = new DataView(waveFileData.buffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + wavDataByteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, wavDataByteLength, true);

    // Write audio data
    const channelData = audioBuffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < frameLength; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return waveFileData;
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', new File([audioBlob], 'recording.wav', { type: 'audio/wav' }));
      formData.append('templateText', section.content);

      console.log('Sending to backend:', {
        audio: audioBlob,
        templateText: section.content
      });

      const response = await fetch(`${baseUrl}/api/asr`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('ASR request failed');
      }

      const data = await response.json();
      console.log('Response from backend:', data);

      if (data.chatResponse && data.chatResponse.mergedText) {
        const cleanMergedText = data.chatResponse.mergedText.replace(/^"|"$/g, '');
        onUpdateContent(section.id, cleanMergedText);
      }

    } catch (error) {
      console.error('Error sending audio to ASR:', error);
      alert('Error processing audio: ' + error.message);
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div
        className={`border rounded-lg p-4 relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
        onClick={() => !isDisabled && onSelect(section.id)}
      >
        <div className='flex justify-between gap-10'>
          <div>
            <h3 className="font-medium mb-2">{section.title}</h3>
            <div className="text-gray-800 whitespace-pre-wrap">{section.content}</div>
          </div>

          {!isDisabled && (
            <div className=" flex space-x-5 mt-3">

              {isSelected && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRecording) {
                        stopRecording();
                      } else {
                        startRecording();
                      }
                    }}
                    className={`p-1 hover:bg-gray-100 rounded ${isRecording ? 'bg-red-100' : ''}`}
                    title={isRecording ? 'Stop Recording' : 'Start Recording'}
                  >
                    {isRecording ? (
                      <Square className="h-10 w-10 text-red-500" />
                    ) : (
                      <Mic className="h-10 w-10 text-gray-500" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAiChat(true);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <div className="h-10 w-10 text-gray-500 flex items-center gap-1 text-5xl font-bold">
                      <img src="/Images/christmas-stars.png" alt="AI" />
                    </div>
                  </button>

                  {isRecording && (
                    <span className="text-red-500 text-sm">
                      {formatTime(recordingTime)}
                    </span>
                  )}
                </>
              )}
            </div>
          )}



        </div>
        <AiChat
          isOpen={showAiChat}
          onClose={() => setShowAiChat(false)}
          content={section.content}
          onUpdateContent={handleAiUpdate}
        />
      </div>
      <div className='mt-4'>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(section.id);
          }}
          className="p-1 hover:bg-gray-100 rounded"
          title="Duplicate"
        >
          <Copy className="h-4 w-4 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(section.id);
          }}
          className="p-1 hover:bg-gray-100 rounded"
          title="Add Below"
        >
          <Plus className="h-4 w-4 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(section.id);
          }}
          className="p-1 hover:bg-gray-100 rounded"
          title="Delete"
        >
          <Trash2 className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
};

const Preview = ({ isOpen, onClose, sections, onExport, onUpdateContent, selectedSectionId, onSelect }) => {
  if (!isOpen) return null;

  return (
    <div className="flex justify-end border">
      <div className=" overflow-auto">
        <div className="sticky top-0 bg-white z-10 p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="space-x-2">
              <button
                onClick={() => onExport('pdf')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4 inline-block mr-2" />
                Export PDF
              </button>
              <button
                onClick={() => onExport('docx')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4 inline-block mr-2" />
                Export DOCX
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {sections.map((section, index) => (
              <div
                key={index}
                className={`preview-section p-4 rounded-lg ${selectedSectionId === section.id ? 'bg-blue-50' : ''
                  }`}
              >
                <h3 className="font-medium mb-2">{section.title}</h3>
                {typeof section.content === 'string' ? section.content : JSON.stringify(section.content)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const GenerateDocument = () => {
  const fileInputRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [notes, setNotes] = useState('');
  const [isShowNote, setIsShowNote] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sections, setSections] = useState([]);
  const [showAddContent, setShowAddContent] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [addPosition, setAddPosition] = useState(null);
  const [isResetting, setIsResetting] = React.useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/documents`);
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const toggleNotepad = () => {
    setIsShowNote(!isShowNote);
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const handleTemplateChange = async (e) => {
    const templateId = e.target.value;
    if (templateId) {
      try {
        setIsResetting(true);
        const response = await fetch(`${baseUrl}/api/documents/${templateId}`);
        const data = await response.json();
        setSelectedTemplate(templateId);
        setDocumentData(data);

        const formattedSections = data.Sheet1.map((item, index) => ({
          id: index,
          title: item['NameofFields'],
          content: item['ExampleContent'],
        }));
        setSections(formattedSections);
      } catch (error) {
        console.error('Error fetching document data:', error);
      } finally {
        setIsResetting(false);
      }
    } else {
      handleReset();
    }
  };

  const handleReset = () => {
    setIsResetting(true);
    setSelectedTemplate(null);
    setDocumentData(null);
    setSections([]);
    setSelectedSectionId(null);
    setTimeout(() => setIsResetting(false), 500);
  };

  const handleDuplicate = (sectionId) => {
    const sectionIndex = sections.findIndex(section => section.id === sectionId);
    const sectionToDuplicate = sections[sectionIndex];
    const newSection = {
      ...sectionToDuplicate,
      id: Date.now()
    };
    const newSections = [...sections];
    newSections.splice(sectionIndex + 1, 0, newSection);
    setSections(newSections);
  };

  const handleDelete = (sectionId) => {
    setSections(sections.filter(section => section.id !== sectionId));
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
    }
  };

  const handleAddBelowSection = (sectionId) => {
    const sectionIndex = sections.findIndex(section => section.id === sectionId);
    setShowAddContent(true);
    setAddPosition(sectionIndex + 1);
  };

  const handleUpdateSectionContent = (sectionId, newContent) => {
    setSections(sections.map(section =>
      section.id === sectionId
        ? { ...section, content: newContent }
        : section
    ));
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(`${baseUrl}/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections })
      });

      if (!response.ok) {
        throw new Error(`Failed to export ${format} file`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };


  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    // File size validation (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      alert('File size exceeds 10MB limit. Please choose a smaller file.');
      e.target.value = ''; // Reset the file input
      return;
    }
  
    // File type validation
    if (!['text/plain', 'application/json'].includes(file.type)) {
      alert('Unsupported file type. Please upload a plain text or JSON file.');
      e.target.value = '';
      return;
    }
  
    try {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        let content = '';
        
        try {
          content = event.target.result;
          if (!content || typeof content !== 'string') {
            throw new Error('Invalid file content');
          }
  
          content = content.replace(/[^\x20-\x7E\n\t]/g, '');
  
          const lines = content.split('\n').filter(line => line.trim());
          const sheet1 = [];
          let currentIndex = -1;
  
          lines.forEach((line) => {
            const splitIndex = line.indexOf(':');
            if (splitIndex > -1) {
              currentIndex++;
              const fieldName = line.substring(0, splitIndex).trim();
              const fieldContent = line.substring(splitIndex + 1).trim();
  
              sheet1.push({
                NameofFields: fieldName,
                ExampleContent: fieldContent
              });
            } else if (currentIndex >= 0) {
              sheet1[currentIndex].ExampleContent += '\n' + line.trim();
            }
          });
  
          const documentData = {
            id: uuidv4(),
            Sheet1: sheet1
          };

          const response = await fetch(`${baseUrl}/api/court-document`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(documentData)
          });
  
          if (!response.ok) {
            throw new Error('Failed to upload document');
          }
  
          e.target.value = '';
          alert('Document uploaded successfully!');
  
        } catch (error) {
          console.error('Processing error:', error);
          alert('Error processing file. Please ensure the file contains valid text.');
          return;
        }
      };

      reader.readAsText(file, 'UTF-8');
  
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img src='/Images/firstdraftlogowithbackground.png' className='w-10 rounded' alt="Logo" />
              </div>
              <div className="ml-4 flex space-x-8">
                <span className="text-blue-600 font-medium">GENERATE DOCUMENT</span>
                <span className="text-gray-500">MY DOCUMENTS</span>
                <span className="text-gray-500">LOGOUT</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={toggleNotepad} title="Notes">
                <Pencil className="h-5 w-5 text-gray-500 hover:text-gray-700" />
              </button>

              <button onClick={togglePreview} title="Preview">
                <Printer className="h-5 w-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            className="text-blue-600 font-medium outline-none"
            disabled={isResetting}
          >
            USE MY OWN DOCUMENT
          </button>
          <hr className='w-48 mt-6 border-blue-600' />
        </div>



        {sections.length > 0 ? (
          <div className="mt-8  flex w-full gap-3">
            <div>
              <div className="flex space-x-4 mb-8">
                <select
                  className="w-full p-2 border rounded-md text-gray-500 outline-none"
                  onChange={handleTemplateChange}
                  value={selectedTemplate || ''}
                  disabled={isResetting}
                >
                  <option value="">Select Template (Optional)</option>
                  {templates.map((template) => (
                    <option key={template._id} value={template._id}>
                      {template.name}
                    </option>
                  ))}
                </select>

                {selectedTemplate && (
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          RESET
        </button>
      )}

<div className="flex space-x-4">
        <button
          className={`px-6 py-2 text-white rounded-md flex items-center ${
            selectedTemplate ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-500 hover:bg-blue-600'
          }`}
          onClick={() => fileInputRef.current.click()}
          disabled={selectedTemplate}
        >
          <Upload className="mr-2 h-5 w-5" />
          UPLOAD FILE
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          disabled={selectedTemplate}
          accept=".txt,.doc,.docx,.pdf, .json"
          onChange={handleFileUpload}
        />
      </div>
              </div>
              {sections.map(section => (
                <Section
                  key={section.id}
                  section={section}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onAdd={handleAddBelowSection}
                  isSelected={selectedSectionId === section.id}
                  onSelect={setSelectedSectionId}
                  isDisabled={isResetting}
                  onUpdateContent={handleUpdateSectionContent}
                />

              ))}

            </div>
            <div>
              <Preview
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                sections={sections}
                onExport={handleExport}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex space-x-4 mb-8">
              <select
                className="w-full p-2 border rounded-md text-gray-500 outline-none"
                onChange={handleTemplateChange}
                value={selectedTemplate || ''}
                disabled={isResetting}
              >
                <option value="">Select Template (Optional)</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name}
                  </option>
                ))}
              </select>

              {selectedTemplate && (
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  RESET
                </button>
              )}

              <div className="flex space-x-4">
                <button
                  className="px-6 py-2 bg-gray-500 text-white rounded-md flex items-center hover:bg-blue-600"
                  onClick={() => fileInputRef.current.click()}
                  disabled={isResetting}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  UPLOAD FILE
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  disabled={isResetting}
                  accept=".txt,.doc,.docx,.pdf ,.json"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
            <div className="text-center mb-60">
              <h1 className="text-4xl font-bold mb-4 flex items-center justify-center">
                Welcome to First Draft
                <img src='/Images/Group (9).png' className='w-6 ml-5' alt="First Draft Icon" />
              </h1>
              <h2 className="text-2xl font-bold mb-4">
                Get started now and take the hassle out of legal paperwork!
              </h2>
              <p className="text-gray-600">
                Enjoy a smooth, guided process that empowers you to create professional, reliable documents with ease.
              </p>
            </div>
          </>
        )}

        {isShowNote && (
          <div className="fixed top-20 right-24 border bg-white p-4 rounded-lg shadow-lg z-50">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Add Notes</h3>
              <button onClick={toggleNotepad}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              placeholder="Write Your Notes Here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-64 h-32 p-2 border rounded outline-none resize-none"
            />
          </div>
        )}

        <footer className="text-center text-gray-500 text-sm mt-8">
          <div className="flex items-center justify-center mb-2">
            <img src="/Images/footerImage.png" alt="Vaqalat" className="h-7 mr-2" />
            © 2024 Drafting Application All rights reserved |{" "}
            <a href="#" className="ml-1 hover:underline">Privacy Policy</a> |{" "}
            <a href="#" className="mx-1 hover:underline">Terms of Service</a> |{" "}
            <a href="#" className="ml-1 hover:underline">Contact Us</a>
          </div>
          <p>Designed with care to streamline your document drafting process.</p>

        </footer>
      </div>
    </div>
  );
};

export default GenerateDocument;
