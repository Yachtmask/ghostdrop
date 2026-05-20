import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useUploadBlobs } from "@shelby-protocol/react";
import { ShelbyClient } from "@shelby-protocol/sdk/browser";
import { Network } from '@aptos-labs/ts-sdk';
import { motion } from 'framer-motion';
import { Upload, Shield, CheckCircle2, Plus, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { EncryptionService } from '../services/encryptionService';
import { shelbyService } from '../services/shelbyService';

const shelbyClient = new ShelbyClient({
  network: Network.SHELBYNET,
  apiKey: import.meta.env.VITE_SHELBY_API_KEY || import.meta.env.NEXT_PUBLIC_SHELBY_API_KEY || '',
});

interface Recipient {
  email: string;
}

const CreateVault = () => {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const { mutateAsync: uploadBlobs } = useUploadBlobs({ client: shelbyClient });
  const navigate = useNavigate();
  
  const [file, setFile] = useState<File | null>(null);
  const [timerValue, setTimerValue] = useState(30);
  const [timerUnit, setTimerUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days' | 'months'>('days');
  const [passphrase, setPassphrase] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([{ email: '' }]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [isFullyPrepared, setIsFullyPrepared] = useState(false);
  const [finalBlobs, setFinalBlobs] = useState<any[]>([]);
  const [metadataBlobNameState, setMetadataBlobNameState] = useState('');

  const [preparedData, setPreparedData] = useState<{
    encryptedFileData: Uint8Array;
    commitments: any;
    aesKey: CryptoKey;
  } | null>(null);

  // Reset preparation state if inputs change
  React.useEffect(() => {
    setIsFullyPrepared(false);
  }, [file, timerValue, timerUnit, passphrase, recipients]);

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 text-center px-4">
        <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-800">
          <Shield className="w-12 h-12 text-slate-700" />
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Connect Your Wallet</h2>
          <p className="text-slate-400 max-w-md text-sm sm:text-base">Please connect your Aptos wallet to create a new secure vault.</p>
        </div>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size exceeds 50MB limit.');
        return;
      }
      setFile(selectedFile);
      setIsPreparing(true);
      setProgressText('Encrypting file locally...');
      
      try {
        // Pre-calculate encryption and commitments to avoid popup blocker on submit
        const aesKey = await EncryptionService.generateKey();
        const encryptedFileBlob = await EncryptionService.encryptFile(selectedFile, aesKey);
        const encryptedFileData = new Uint8Array(await encryptedFileBlob.arrayBuffer());
        const commitments = await shelbyService.generateCommitments(encryptedFileData);
        
        setPreparedData({ encryptedFileData, commitments, aesKey });
      } catch (error) {
        console.error("Failed to prepare file:", error);
        toast.error("Failed to encrypt file");
        setFile(null);
      } finally {
        setIsPreparing(false);
        setProgressText('');
      }
    }
  };

  const addRecipient = () => {
    setRecipients([...recipients, { email: '' }]);
  };

  const updateRecipient = (index: number, field: keyof Recipient, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index][field] = value;
    setRecipients(newRecipients);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const getDurationMs = () => {
    const multipliers = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000,
    };
    return timerValue * multipliers[timerUnit];
  };

  const handlePrepare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return toast.error("Connect wallet first");
    if (!file || !preparedData) return toast.error('Please select a file to upload.');
    if (!passphrase) return toast.error('Please enter a passphrase to encrypt the file.');
    if (recipients.length === 0 || !recipients[0].email) return toast.error('Please add at least one recipient with an email.');

    setIsPreparing(true);
    setProgressText('Finalizing encryption...');
    
    try {
      // 1. Export AES Key and Encrypt it with Passphrase (Fast)
      const exportedKey = await EncryptionService.exportKey(preparedData.aesKey);
      const encryptedKeyPackage = await EncryptionService.encryptKeyForRecipient(exportedKey, passphrase);

      const blobName = `${Date.now()}_${file.name}`;

      // 2. Prepare Metadata
      setProgressText('Preparing metadata...');
      const durationMs = getDurationMs();
      const dropTimestamp = Date.now() + durationMs;

      const metadata = {
        vaults: [{
          blobName,
          fileName: file.name,
          uploadTimestamp: Date.now(),
          durationMs,
          dropTimestamp,
          notified: false,
          recipients: recipients.map(r => ({
            ...r,
            encryptedKeyPackage
          }))
        }]
      };

      const metadataBlobName = `ghostdrop_meta_${Date.now()}.json`;
      const metadataData = new TextEncoder().encode(JSON.stringify(metadata));
      const metaCommitments = await shelbyService.generateCommitments(metadataData);

      setFinalBlobs([
        {
          blobName,
          blobData: preparedData.encryptedFileData,
          commitments: preparedData.commitments,
        },
        {
          blobName: metadataBlobName,
          blobData: metadataData,
          commitments: metaCommitments,
        }
      ]);
      setMetadataBlobNameState(metadataBlobName);
      setIsFullyPrepared(true);
    } catch (error: any) {
      console.error('Preparation failed:', error);
      toast.error(`Preparation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsPreparing(false);
      setProgressText('');
    }
  };

  const handleUpload = async () => {
    if (!account) return toast.error("Connect wallet first");
    
    setIsProcessing(true);
    setProgressText('Uploading to Shelby...');
    
    try {
      // Upload both blobs in a single transaction to preserve user gesture
      await uploadBlobs({
        // @ts-ignore
        signer: { account, signAndSubmitTransaction },
        blobs: finalBlobs,
        // @ts-ignore
        expirationMicros: BigInt(Date.now() * 1000 + 3650 * 24 * 3600 * 1_000_000), // 10 years
      });

      // Register with Watchdog
      setProgressText('Registering with Watchdog...');
      await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountAddress: account.address.toString(),
          metadataBlobName: metadataBlobNameState,
          passphrase: passphrase // Send to secure backend only
        })
      });

      toast.success('Vault created and secured successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Finalization failed:', error);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
      setIsFullyPrepared(false); // Reset so they can try again
    } finally {
      setIsProcessing(false);
      setProgressText('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12 pb-12 sm:pb-20 px-4 sm:px-0 overflow-x-hidden">
      <div className="text-center space-y-2 sm:space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Create Dead Man's Switch</h1>
        <p className="text-slate-400 text-sm sm:text-base">Encrypt your files, set a timer, and we'll securely release them if you don't check in.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 sm:p-6 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-[48px] bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden"
      >
        <form onSubmit={isFullyPrepared ? (e) => { e.preventDefault(); handleUpload(); } : handlePrepare} className="space-y-8 sm:space-y-12">
          
          {/* File Upload */}
          <div className="space-y-4">
            <label className="block text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
              1. Select File
            </label>
            <div 
              className={`relative border-2 border-dashed rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-center transition-all ${
                file ? 'border-blue-500/50 bg-blue-500/5' : 'border-slate-800 hover:border-slate-700 bg-slate-950'
              }`}
            >
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              <div className="space-y-3 sm:space-y-4">
                <div className="w-12 sm:w-16 h-12 sm:h-16 bg-slate-900 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto">
                  {file ? <CheckCircle2 className="w-6 sm:w-8 h-6 sm:h-8 text-blue-400" /> : <Upload className="w-6 sm:w-8 h-6 sm:h-8 text-slate-600" />}
                </div>
                <div>
                  <p className="text-base sm:text-lg font-bold break-words">{file ? file.name : 'Select or drag file'}</p>
                  <p className="text-xs sm:text-sm text-slate-500">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Max size 50MB'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Timer UI */}
          <div className="space-y-4">
            <label className="block text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
              2. Set Timer
            </label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="number"
                min="1"
                value={timerValue}
                onChange={(e) => setTimerValue(Number(e.target.value))}
                className="flex-1 px-3 sm:px-4 py-3 sm:py-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-sm sm:text-base"
                disabled={isProcessing}
              />
              <select
                value={timerUnit}
                onChange={(e) => setTimerUnit(e.target.value as any)}
                className="flex-1 px-3 sm:px-4 py-3 sm:py-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-sm sm:text-base"
                disabled={isProcessing}
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
              </select>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Vault will drop if timer reaches zero.</span>
            </p>
          </div>

          {/* Encryption Passphrase */}
          <div className="space-y-4">
            <label className="block text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
              3. Encryption Passphrase
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter a strong passphrase"
              className="w-full px-3 sm:px-4 py-3 sm:py-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none text-sm sm:text-base"
              disabled={isProcessing}
            />
            <p className="text-xs sm:text-sm text-slate-500">
              This encrypts the AES key. You must share this passphrase with your recipients out-of-band.
            </p>
          </div>

          {/* Recipients */}
          <div className="space-y-4">
            <label className="block text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
              4. Recipients
            </label>
            <div className="space-y-3 sm:space-y-4">
              {recipients.map((recipient, index) => (
                <div key={index} className="p-3 sm:p-4 bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl space-y-3 sm:space-y-4 relative">
                  {recipients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRecipient(index)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-red-400 flex-shrink-0"
                    >
                      <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                    </button>
                  )}
                  <input
                    type="email"
                    placeholder="Email Address (Required)"
                    value={recipient.email}
                    onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl focus:border-blue-500 outline-none text-sm sm:text-base"
                    disabled={isProcessing}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addRecipient}
                disabled={isProcessing}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" /> Add Another Recipient
              </button>
            </div>
          </div>

          {isFullyPrepared ? (
            <button
              type="button"
              onClick={handleUpload}
              disabled={isProcessing}
              className={`w-full py-4 sm:py-6 rounded-xl sm:rounded-2xl font-bold text-base sm:text-xl transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-2xl bg-green-600 hover:bg-green-700 text-white shadow-green-600/30`}
            >
              {isProcessing ? (
                progressText || 'Processing...'
              ) : (
                <>
                  <Shield className="w-5 sm:w-6 h-5 sm:h-6" />
                  <span className="hidden sm:inline">Confirm in Wallet & Upload</span>
                  <span className="sm:hidden">Confirm & Upload</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isPreparing || !file || !passphrase}
              className={`w-full py-4 sm:py-6 rounded-xl sm:rounded-2xl font-bold text-base sm:text-xl transition-all flex items-center justify-center gap-2 sm:gap-3 shadow-2xl ${
                isPreparing || !file || !passphrase
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
              }`}
            >
              {isPreparing ? (
                progressText || 'Preparing File...'
              ) : (
                <>
                  <Shield className="w-5 sm:w-6 h-5 sm:h-6" />
                  Prepare Vault
                </>
              )}
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default CreateVault;
