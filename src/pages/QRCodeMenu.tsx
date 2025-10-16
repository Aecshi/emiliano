import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Link, Printer } from 'lucide-react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

const QRCodeMenu = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const baseUrl = window.location.origin;
  const menuUrl = tableNumber 
    ? `${baseUrl}/customer-menu?table=${tableNumber}` 
    : `${baseUrl}/customer-menu`;
  const qrValue = customUrl ? customUrl : menuUrl;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    
    if (printWindow && qrCodeRef.current) {
      const qrCodeHtml = qrCodeRef.current.innerHTML;
      const tableInfo = tableNumber ? `for Table ${tableNumber}` : '';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Print QR Code</title>
            <style>
              body { 
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                padding: 20px;
                box-sizing: border-box;
              }
              .qr-container {
                text-align: center;
                padding: 20px;
                border: 1px dashed #ccc;
                display: inline-block;
              }
              h2 {
                margin-bottom: 10px;
                color: #333;
              }
              p {
                margin-top: 10px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>Emiliano Ristorante Menu ${tableInfo}</h2>
              ${qrCodeHtml}
              <p>Scan to view our menu on your device</p>
              ${tableNumber ? `<p><strong>Table: ${tableNumber}</strong></p>` : ''}
            </div>
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeRef.current) return;
    
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;
    
    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.download = tableNumber 
        ? `emiliano-ristorante-menu-table-${tableNumber}.png` 
        : 'emiliano-ristorante-menu-qr.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="pos-container">
      <Header toggleSidebar={toggleSidebar} />

      <div className="pos-grid relative">
        <Sidebar isOpen={sidebarOpen} />

        <div className="pos-content">
          <h1 className="text-2xl font-bold mb-6">QR Code Menu Generator</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Menu QR Code</CardTitle>
                <CardDescription>
                  Generate a QR code that customers can scan to view the menu on their own devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="table-number">Table Number</Label>
                    <Input
                      id="table-number"
                      placeholder="Enter table number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      This will automatically fill in the table number for customers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="qr-url">Custom URL (optional)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="qr-url"
                        placeholder={menuUrl}
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Leave blank to use default menu URL with table number
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(qrValue);
                      }}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Copy URL
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={printQRCode}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadQRCode}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QR Code Preview</CardTitle>
                <CardDescription>
                  Scan this code to access the menu
                  {tableNumber && ` (Table ${tableNumber})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center" ref={qrCodeRef}>
                  <QRCodeSVG 
                    value={qrValue}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  <p>URL: {qrValue}</p>
                  {tableNumber && (
                    <p className="mt-1 font-medium">Table: {tableNumber}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">How to Use</h2>
            <ol className="space-y-2 list-decimal pl-5">
              <li>Enter the table number (if applicable)</li>
              <li>Generate the QR code for your menu</li>
              <li>Print the QR code or download it as an image</li>
              <li>Place the QR code on tables or include in printed menus</li>
              <li>Customers can scan the code with their phones to view the full menu and place orders</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeMenu; 