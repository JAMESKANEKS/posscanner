import { useEffect, useState, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { get, ref, child } from "firebase/database";
import { db } from "../firebase";

export default function ScannerPage() {
  const [errorMsg, setErrorMsg] = useState("");
  const [isScanning, setIsScanning] = useState(true);
  const [lastScanned, setLastScanned] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [scanHistory, setScanHistory] = useState([]);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (scannerInitialized) return;

    const html5QrCode = new Html5Qrcode("scanner-container");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 10,
      qrbox: { width: 300, height: 100 },
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    };

    html5QrCode
      .start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (!decodedText) return;
          
          // Prevent duplicate scans
          if (decodedText === lastScanned) return;
          
          setLastScanned(decodedText);
          setScanCount(prev => prev + 1);
          setIsScanning(false);

          try {
            // 🔎 Look up product by barcode
            const snapshot = await get(child(ref(db), "products"));
            const productsData = snapshot.val() || {};
            const productList = Object.keys(productsData).map((key) => ({
              id: key,
              ...productsData[key],
            }));

            const product = productList.find((p) => p.barcode === decodedText);

            if (product) {
              setScannedProduct(product);
              // Add to scan history
              const newScan = {
                code: decodedText,
                product: product,
                timestamp: new Date().toLocaleString(),
                id: Date.now()
              };
              setScanHistory(prev => [newScan, ...prev.slice(0, 9)]);
            } else {
              setErrorMsg(`Product not found for barcode: ${decodedText}`);
              // Add to scan history even if product not found
              const newScan = {
                code: decodedText,
                product: null,
                timestamp: new Date().toLocaleString(),
                id: Date.now()
              };
              setScanHistory(prev => [newScan, ...prev.slice(0, 9)]);
              // Auto-retry after 2 seconds
              setTimeout(() => {
                setErrorMsg("");
                setIsScanning(true);
                setLastScanned("");
              }, 2000);
            }
          } catch (err) {
            console.error("Error fetching products:", err);
            setErrorMsg("Error fetching product data. Retrying...");
            // Auto-retry after 2 seconds
            setTimeout(() => {
              setErrorMsg("");
              setIsScanning(true);
              setLastScanned("");
            }, 2000);
          }
        },
        (errMsg) => {
          // Only show error messages, not continuous scanning messages
          if (errMsg && !errMsg.includes("No barcode or QR code detected")) {
            setErrorMsg(errMsg);
          }
        }
      )
      .catch((err) => {
        console.error("Scanner failed to start:", err);
        setErrorMsg("Camera access denied or not supported");
      });

    setScannerInitialized(true);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
  }, []); // Remove lastScanned dependency to prevent re-initialization

  // Separate effect to handle scanner restart
  useEffect(() => {
    if (scannerRef.current && scannerInitialized) {
      if (isScanning) {
        // Resume scanning
        scannerRef.current.resume().catch(() => {});
      } else {
        // Pause scanning
        scannerRef.current.pause().catch(() => {});
      }
    }
  }, [isScanning, scannerInitialized]);

  const restartScanner = () => {
    setIsScanning(true);
    setLastScanned("");
    setScannedProduct(null);
    setErrorMsg("");
  };

  const clearHistory = () => {
    setScanHistory([]);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Barcode Scanner</h1>

      {/* Scanner Section */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <h2>Scan Barcode</h2>
        
        <div
          id="scanner-container"
          style={{
            width: "100%",
            maxWidth: "400px",
            height: "200px",
            border: isScanning ? "2px solid #00ff00" : "2px solid #ff9900",
            borderRadius: "10px",
            overflow: "hidden",
            position: "relative",
            margin: "0 auto 15px auto",
            backgroundColor: isScanning ? "#000" : "#1a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {!isScanning && scannedProduct && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "white",
              textAlign: "center",
              zIndex: 10
            }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>✅</div>
              <div style={{ fontSize: "14px" }}>Product Found!</div>
            </div>
          )}
        </div>
        
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <p style={{ margin: "5px 0" }}>
            {isScanning ? "� Scanning..." : "🟡 Processing..."}
          </p>
          <p style={{ margin: "5px 0", fontSize: "14px", color: "#666" }}>
            {errorMsg || "Point your camera at a barcode"}
          </p>
          {lastScanned && (
            <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>
              Last scanned: {lastScanned}
            </p>
          )}
          {scanCount > 0 && (
            <p style={{ margin: "5px 0", fontSize: "12px", color: "#666" }}>
              Scans attempted: {scanCount}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!isScanning && (
            <button onClick={restartScanner} style={{
              padding: '10px 15px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}>
              � Start New Scan
            </button>
          )}
        </div>

        {/* Scanned Product Result */}
        {scannedProduct && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '5px'
          }}>
            <h3>✅ Product Found!</h3>
            <p><strong>Name:</strong> {scannedProduct.name}</p>
            <p><strong>Barcode:</strong> {scannedProduct.barcode}</p>
            <p><strong>Price:</strong> ${scannedProduct.price}</p>
            {scannedProduct.category && <p><strong>Category:</strong> {scannedProduct.category}</p>}
            <button onClick={() => copyToClipboard(scannedProduct.barcode)} style={{
              padding: '5px 10px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              marginTop: '10px'
            }}>
              📋 Copy Barcode
            </button>
          </div>
        )}
      </div>

      {/* Scan History */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '10px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2>Scan History</h2>
          {scanHistory.length > 0 && (
            <button onClick={clearHistory} style={{
              padding: '5px 10px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}>
              🗑 Clear
            </button>
          )}
        </div>
        
        {scanHistory.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>No scans yet</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {scanHistory.map(scan => (
              <div key={scan.id} style={{
                padding: '10px',
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div>
                    <strong>{scan.code}</strong>
                    {scan.product && (
                      <span style={{ marginLeft: '10px', color: '#28a745' }}>
                        ✓ {scan.product.name}
                      </span>
                    )}
                    {!scan.product && (
                      <span style={{ marginLeft: '10px', color: '#dc3545' }}>
                        ✗ Not found
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {scan.timestamp}
                  </div>
                </div>
                <button 
                  onClick={() => copyToClipboard(scan.code)}
                  style={{
                    padding: '3px 8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📋
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
