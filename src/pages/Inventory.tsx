import React, { useState, useRef } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import InventoryList from '@/components/inventory/InventoryList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, BarChart, FileIcon, Printer, Save } from 'lucide-react';
import { useToast } from "@/hooks/useToast";

// Note: You'll need to install these packages via npm:
// npm install docx file-saver @types/file-saver --save
// @ts-ignore - Install the packages to resolve these errors
import { Document, Packer, Paragraph, Table, TableCell, TableRow, BorderStyle, HeadingLevel, TextRun, AlignmentType, Header as DocxHeader, Footer, PageNumber } from 'docx';
// @ts-ignore - Install the packages to resolve these errors
import { saveAs } from 'file-saver';

// Sample inventory data for reports
const inventoryItems = [
  { 
    id: 'INV001', 
    name: 'Tomatoes', 
    category: 'Vegetables',
    quantity: 25, 
    unit: 'kg', 
    unitPrice: 45, 
    totalValue: 1125,
    status: 'In Stock',
    lastUpdated: '2023-04-15'
  },
  { 
    id: 'INV002', 
    name: 'Chicken Breast', 
    category: 'Meat',
    quantity: 18, 
    unit: 'kg', 
    unitPrice: 280, 
    totalValue: 5040,
    status: 'In Stock',
    lastUpdated: '2023-04-15'
  },
  { 
    id: 'INV003', 
    name: 'Basmati Rice', 
    category: 'Grains',
    quantity: 50, 
    unit: 'kg', 
    unitPrice: 72, 
    totalValue: 3600,
    status: 'In Stock',
    lastUpdated: '2023-04-14'
  },
  { 
    id: 'INV004', 
    name: 'Olive Oil', 
    category: 'Oils',
    quantity: 12, 
    unit: 'liter', 
    unitPrice: 225, 
    totalValue: 2700,
    status: 'In Stock',
    lastUpdated: '2023-04-12'
  },
  { 
    id: 'INV005', 
    name: 'Bell Peppers', 
    category: 'Vegetables',
    quantity: 8, 
    unit: 'kg', 
    unitPrice: 62.50, 
    totalValue: 500,
    status: 'Low Stock',
    lastUpdated: '2023-04-15'
  }
];

// Sample usage data for reports
const usageData = [
  { itemId: 'INV001', date: '2023-04-14', used: 5 },
  { itemId: 'INV002', date: '2023-04-14', used: 3 },
  { itemId: 'INV001', date: '2023-04-13', used: 4 },
  { itemId: 'INV003', date: '2023-04-13', used: 8 },
  { itemId: 'INV002', date: '2023-04-12', used: 2 },
  { itemId: 'INV004', date: '2023-04-12', used: 1 },
  { itemId: 'INV001', date: '2023-04-11', used: 3 },
  { itemId: 'INV003', date: '2023-04-11', used: 5 },
  { itemId: 'INV005', date: '2023-04-10', used: 2 },
  { itemId: 'INV002', date: '2023-04-10', used: 4 }
];

const Inventory = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [currentReportTitle, setCurrentReportTitle] = useState('');
  const [currentReportSubtitle, setCurrentReportSubtitle] = useState('');
  const [currentReportData, setCurrentReportData] = useState([]);
  const [currentReportSummary, setCurrentReportSummary] = useState({});
  const printableReportRef = useRef(null);
  const { toast } = useToast();
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Old functions for CSV generation
  const generateCSV = (data, headers) => {
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(item => {
      const values = headers.map(header => {
        const value = item[header] || '';
        return `"${value}"`;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  };
  
  const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to create a Word document with professional formatting
  const createWordDocument = async (data, title, subtitle, summaryData) => {
    try {
      console.log('Starting Word document generation...');
      console.log('Document packages loaded:', { Document, Packer, Paragraph, Table });
      // Create a new document
      const doc = new Document({
        creator: "Emiliano Restaurant System",
        title: title,
        description: subtitle,
        styles: {
          paragraphStyles: [
            {
              id: "Heading1",
              name: "Heading 1",
              run: {
                size: 36,
                bold: true,
                color: "2E5A88"
              },
              paragraph: {
                spacing: {
                  after: 200
                }
              }
            },
            {
              id: "Heading2",
              name: "Heading 2",
              run: {
                size: 28,
                bold: true,
                color: "2E5A88"
              },
              paragraph: {
                spacing: {
                  after: 120
                }
              }
            },
            {
              id: "Subtitle",
              name: "Subtitle",
              run: {
                size: 24,
                italics: true,
                color: "5C5C5C"
              },
              paragraph: {
                spacing: {
                  after: 200
                }
              }
            },
            {
              id: "Normal",
              name: "Normal",
              run: {
                size: 22
              },
              paragraph: {
                spacing: {
                  after: 120
                }
              }
            }
          ]
        },
        sections: [{
          headers: {
            default: new DocxHeader({
              children: [
                new Paragraph({
                  text: "Emiliano Restaurant",
                  alignment: AlignmentType.RIGHT,
                  style: "Normal"
                })
              ]
            })
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun("Page "),
                    new TextRun({
                      children: ["PAGE_NUMBER"],
                    })
                  ]
                })
              ]
            })
          },
          children: [
            // Title
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER
            }),
            
            // Subtitle
            new Paragraph({
              text: subtitle,
              style: "Subtitle",
              alignment: AlignmentType.CENTER
            }),
            
            // Generation time
            new Paragraph({
              text: `Generated on: ${new Date().toLocaleString()}`,
              alignment: AlignmentType.RIGHT,
              style: "Normal"
            }),
            
            // Executive Summary Section
            new Paragraph({
              text: "Executive Summary",
              heading: HeadingLevel.HEADING_2,
              spacing: {
                before: 400,
                after: 200
              }
            }),
            
            // Summary data table
            new Table({
              rows: Object.entries(summaryData).map(([key, value]) => {
                return new TableRow({
                  children: [
                    new TableCell({
                      width: {
                        size: 4000,
                        type: "dxa"
                      },
                      children: [new Paragraph({ text: key, style: "Normal" })],
                      borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE }
                      }
                    }),
                    new TableCell({
                      width: {
                        size: 4000,
                        type: "dxa"
                      },
                      children: [new Paragraph({ text: value.toString(), style: "Normal" })],
                      borders: {
                        top: { style: BorderStyle.NONE },
                        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
                        left: { style: BorderStyle.NONE },
                        right: { style: BorderStyle.NONE }
                      }
                    })
                  ]
                });
              })
            }),
            
            // Data Section
            new Paragraph({
              text: "Detailed Data",
              heading: HeadingLevel.HEADING_2,
              spacing: {
                before: 400,
                after: 200
              }
            }),
            
            // Data table
            new Table({
              rows: [
                // Header row
                new TableRow({
                  tableHeader: true,
                  children: Object.keys(data[0]).map(header => {
                    return new TableCell({
                      children: [new Paragraph({ 
                        text: header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1'),
                        style: "Normal",
                        alignment: AlignmentType.CENTER
                      })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
                        left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                        right: { style: BorderStyle.SINGLE, size: 1, color: "000000" }
                      },
                      shading: {
                        fill: "E0E0E0"
                      }
                    });
                  })
                }),
                // Data rows
                ...data.map(item => {
                  return new TableRow({
                    children: Object.values(item).map(value => {
                      return new TableCell({
                        children: [new Paragraph({ 
                          text: value.toString(), 
                          style: "Normal",
                          alignment: AlignmentType.LEFT 
                        })],
                        borders: {
                          top: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
                          bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
                          left: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
                          right: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" }
                        }
                      });
                    })
                  });
                })
              ]
            })
          ]
        }]
      });
      
      // Generate the Word document as a blob
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      // Save the document
      console.log('Document generated successfully, saving file...');
      saveAs(blob, `${title.toLowerCase().replace(/\s+/g, '_')}.docx`);
      
      return true;
    } catch (error) {
      console.error("Error generating Word document:", error);
      alert(`Error details: ${error.message}`);
      return false;
    }
  };

  // Print the current report dialog contents
  const printReport = () => {
    const printContent = printableReportRef.current;
    
    if (printContent) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>${currentReportTitle}</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
              body {
                font-family: 'Poppins', sans-serif;
                color: #333;
                padding: 30px;
                margin: 0;
                background-color: #fff;
                line-height: 1.6;
              }
              .report-container {
                max-width: 1000px;
                margin: 0 auto;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .report-banner {
                background: linear-gradient(135deg, #4a2975 0%, #7b4397 100%);
                padding: 25px 40px;
                color: white;
                position: relative;
              }
              .report-banner::after {
                content: '';
                position: absolute;
                bottom: 0;
                right: 0;
                width: 150px;
                height: 150px;
                background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.1)"/></svg>');
                background-repeat: no-repeat;
                background-size: cover;
                opacity: 0.6;
              }
              .report-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
              }
              .report-logo {
                width: 70px;
                height: 70px;
                background-color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 24px;
                color: #4a2975;
                margin-right: 20px;
              }
              .report-title-section {
                flex-grow: 1;
              }
              .report-title {
                font-size: 28px;
                font-weight: 700;
                margin: 0;
                line-height: 1.2;
              }
              .report-subtitle {
                font-size: 16px;
                font-weight: 300;
                margin: 5px 0 0;
                opacity: 0.9;
              }
              .report-date {
                text-align: right;
                font-size: 14px;
                font-weight: 300;
                margin-top: 10px;
              }
              .report-content {
                padding: 30px 40px;
              }
              .section {
                margin-bottom: 30px;
              }
              .section-title {
                font-size: 20px;
                font-weight: 600;
                color: #4a2975;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #f0f0f0;
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 25px;
              }
              .summary-card {
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 15px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              .summary-value {
                font-size: 24px;
                font-weight: 700;
                color: #4a2975;
                margin-bottom: 5px;
              }
              .summary-label {
                font-size: 14px;
                color: #666;
              }
              .data-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 14px;
              }
              .data-table th {
                background-color: #f5f5f5;
                color: #333;
                font-weight: 600;
                text-align: left;
                padding: 12px 15px;
                border-bottom: 2px solid #e0e0e0;
              }
              .data-table td {
                padding: 10px 15px;
                border-bottom: 1px solid #e0e0e0;
              }
              .data-table tr:hover {
                background-color: #f9f9f9;
              }
              .graph-container {
                margin: 25px 0;
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              .graph-title {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 15px;
                text-align: center;
              }
              .bar-graph {
                display: flex;
                height: 250px;
                align-items: flex-end;
                gap: 15px;
                margin: 30px 0 20px;
                padding: 0 10px;
              }
              .bar-container {
                flex-grow: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .bar {
                width: 100%;
                max-width: 70px;
                background: linear-gradient(to top, #4a2975, #7b4397);
                border-radius: 6px 6px 0 0;
                position: relative;
                transition: height 0.3s ease;
              }
              .bar-value {
                position: absolute;
                top: -25px;
                left: 50%;
                transform: translateX(-50%);
                font-weight: 600;
                font-size: 13px;
              }
              .bar-label {
                margin-top: 10px;
                text-align: center;
                font-size: 14px;
                font-weight: 500;
                color: #555;
                max-width: 100px;
              }
              .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #eaeaea;
                text-align: center;
                font-size: 13px;
                color: #777;
              }
              @media print {
                body {
                  padding: 0;
                  background: white;
                }
                .report-container {
                  box-shadow: none;
                  margin: 0;
                  max-width: 100%;
                }
                .report-banner {
                  background: #4a2975 !important;
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                }
                .data-table th {
                  -webkit-print-color-adjust: exact;
                  color-adjust: exact;
                  background-color: #f5f5f5 !important;
                }
                .graph-container, .summary-card {
                  box-shadow: none;
                  border: 1px solid #eaeaea;
                }
              }
            </style>
          </head>
          <body>
            <div class="report-container">
              ${printContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  
  // Generate current inventory report with printable template
  const generateCurrentInventory = () => {
    // Create summary data
    const summaryData = {
      "Total Items": inventoryItems.length,
      "Total Value": `₱${inventoryItems.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}`,
      "Low Stock Items": inventoryItems.filter(item => item.status === 'Low Stock').length,
      "Last Updated": new Date().toLocaleDateString(),
      "Report Type": "Current Inventory"
    };
    
    // Set report data for the dialog
    setCurrentReport('inventory');
    setCurrentReportTitle('Current Inventory Report');
    setCurrentReportSubtitle('Detailed listing of all inventory items');
    setCurrentReportData(inventoryItems);
    setCurrentReportSummary(summaryData);
    setReportDialogOpen(true);
    
    toast({
      title: "Report Generated",
      description: "Current Inventory Report is ready to view and print.",
    });
  };
  
  // Generate usage analysis report with printable template
  const generateUsageAnalysis = () => {
    // Add item names to usage data
    const usageWithNames = usageData.map(usage => {
      const item = inventoryItems.find(item => item.id === usage.itemId);
      return {
        ...usage,
        itemName: item ? item.name : 'Unknown',
        category: item ? item.category : 'Unknown',
        unit: item ? item.unit : 'units'
      };
    });
    
    // Calculate summary stats
    const totalUsed = usageWithNames.reduce((sum, usage) => sum + usage.used, 0);
    const uniqueItems = new Set(usageWithNames.map(usage => usage.itemId)).size;
    const startDate = usageWithNames.reduce((earliest, usage) => 
      new Date(usage.date) < new Date(earliest) ? usage.date : earliest, 
      usageWithNames[0].date
    );
    const endDate = usageWithNames.reduce((latest, usage) => 
      new Date(usage.date) > new Date(latest) ? usage.date : latest, 
      usageWithNames[0].date
    );
    const dateRange = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    
    // Item with highest usage
    const itemUsage = {};
    usageWithNames.forEach(usage => {
      if (!itemUsage[usage.itemName]) {
        itemUsage[usage.itemName] = 0;
      }
      itemUsage[usage.itemName] += usage.used;
    });
    
    const highestUsageItem = Object.entries(itemUsage)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    
    // Create summary data
    const summaryData = {
      "Total Consumption": `${totalUsed} units`,
      "Items Tracked": uniqueItems,
      "Date Range": dateRange,
      "Highest Consumption Item": `${highestUsageItem[0]} (${highestUsageItem[1]} units)`,
      "Report Type": "Usage Analysis"
    };
    
    // Set report data for the dialog
    setCurrentReport('usage');
    setCurrentReportTitle('Inventory Usage Analysis Report');
    setCurrentReportSubtitle('Detailed analysis of inventory consumption over time');
    setCurrentReportData(usageWithNames);
    setCurrentReportSummary(summaryData);
    setReportDialogOpen(true);
    
    toast({
      title: "Report Generated",
      description: "Usage Analysis Report is ready to view and print.",
    });
  };

  // Generate valuation report with printable template
  const generateValuationReport = () => {
    // Add some additional calculated fields for the valuation report
    const valuationData = inventoryItems.map(item => ({
      ...item,
      averageCost: (item.totalValue / item.quantity).toFixed(2),
      inventoryAge: '15 days', // Mock data
      reorderPoint: item.category === 'Vegetables' ? 15 : 10,
      reorderStatus: item.quantity < (item.category === 'Vegetables' ? 15 : 10) ? 'Reorder' : 'OK'
    }));
    
    // Calculate financial summary
    const totalValue = valuationData.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2);
    const averageItemValue = (parseFloat(totalValue) / valuationData.length).toFixed(2);
    const itemsNeedingReorder = valuationData.filter(item => item.reorderStatus === 'Reorder').length;
    
    // Calculate value by category
    const categoryValues = {};
    valuationData.forEach(item => {
      if (!categoryValues[item.category]) {
        categoryValues[item.category] = 0;
      }
      categoryValues[item.category] += item.totalValue;
    });
    
    const topCategory = Object.entries(categoryValues)
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    
    // Create summary data
    const summaryData = {
      "Total Inventory Value": `₱${totalValue}`,
      "Average Item Value": `₱${averageItemValue}`,
      "Items Needing Reorder": itemsNeedingReorder,
      "Highest Value Category": `${topCategory[0]} (₱${(topCategory[1] as number).toFixed(2)})`,
      "Report Type": "Financial Valuation",
      "Report Date": new Date().toLocaleDateString()
    };
    
    // Set report data for the dialog
    setCurrentReport('valuation');
    setCurrentReportTitle('Inventory Valuation Report');
    setCurrentReportSubtitle('Financial analysis and valuation of current inventory');
    setCurrentReportData(valuationData);
    setCurrentReportSummary(summaryData);
    setReportDialogOpen(true);
    
    toast({
      title: "Report Generated",
      description: "Inventory Valuation Report is ready to view and print.",
    });
  };

  return (
    <div className="pos-container">
      <Header toggleSidebar={toggleSidebar} />

      <div className="pos-grid relative">
        <Sidebar isOpen={sidebarOpen} />

        <div className="pos-content">
          <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>
          
          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="items">Inventory Items</TabsTrigger>
              <TabsTrigger value="reports">Inventory Reports</TabsTrigger>
            </TabsList>
            
            <TabsContent value="items">
              <InventoryList />
            </TabsContent>
            
            <TabsContent value="reports">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Inventory Value</CardTitle>
                    <CardDescription>Total value of current inventory</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">₱12,967.50</div>
                    <p className="text-sm text-muted-foreground">Updated today</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Low Stock Items</CardTitle>
                    <CardDescription>Items below minimum threshold</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">2</div>
                    <p className="text-sm text-muted-foreground">Need attention</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Generate Inventory Report</CardTitle>
                  <CardDescription>Create detailed inventory reports for your records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="cursor-pointer hover:bg-gray-50">
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <FileIcon className="h-5 w-5 text-restaurant-primary mb-2" />
                        <h3 className="font-medium text-center">Current Inventory</h3>
                        <p className="text-xs text-muted-foreground text-center mt-1">Complete inventory snapshot</p>
                        <Button variant="outline" className="mt-4 w-full" onClick={generateCurrentInventory}>
                          <FileIcon className="h-5 w-5 mr-2" /> Generate Report
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="cursor-pointer hover:bg-gray-50">
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <FileIcon className="h-5 w-5 text-restaurant-primary mb-2" />
                        <h3 className="font-medium text-center">Usage Analysis</h3>
                        <p className="text-xs text-muted-foreground text-center mt-1">Consumption over time</p>
                        <Button variant="outline" className="mt-4 w-full" onClick={generateUsageAnalysis}>
                          <FileIcon className="h-5 w-5 mr-2" /> Generate Report
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="cursor-pointer hover:bg-gray-50">
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <FileIcon className="h-5 w-5 text-restaurant-primary mb-2" />
                        <h3 className="font-medium text-center">Valuation Report</h3>
                        <p className="text-xs text-muted-foreground text-center mt-1">Financial inventory value</p>
                        <Button variant="outline" className="mt-4 w-full" onClick={generateValuationReport}>
                          <FileIcon className="h-5 w-5 mr-2" /> Generate Report
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Printable Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-restaurant-primary to-purple-600 text-white p-6 rounded-t-md">
            <div className="flex items-center">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-restaurant-primary text-xl font-bold mr-4">ER</div>
              <div>
                <DialogTitle className="text-white text-2xl font-bold m-0">{currentReportTitle}</DialogTitle>
                <DialogDescription className="text-white/90 mt-1">{currentReportSubtitle}</DialogDescription>
              </div>
            </div>
          </div>
          
          <ScrollArea className="h-[600px] p-0 border-0">
            <div ref={printableReportRef}>
              {/* Report Banner and Header */}
              <div className="report-banner">
                <div className="report-header">
                  <div className="report-logo">ER</div>
                  <div className="report-title-section">
                    <h1 className="report-title">{currentReportTitle}</h1>
                    <p className="report-subtitle">{currentReportSubtitle}</p>
                  </div>
                </div>
                <p className="report-date">Generated on: {new Date().toLocaleString()}</p>
              </div>
              
              {/* Report Content */}
              <div className="report-content">
                {/* Summary Section */}
                <div className="section">
                  <h2 className="section-title">Executive Summary</h2>
                  <div className="summary-grid">
                    {currentReportSummary && Object.entries(currentReportSummary).map(([key, value]) => (
                      <div key={key} className="summary-card">
                        <div className="summary-value">{value?.toString()}</div>
                        <div className="summary-label">{key}</div>
                      </div>
                    ))}
                  </div>
                </div>
              
              {/* Visualization Section */}
              {currentReport === 'inventory' && (
                <div className="section">
                  <h2 className="section-title">Category Distribution</h2>
                  <div className="graph-container">
                    <div className="graph-title">Value by Category</div>
                    <div className="bar-graph">
                      {Array.from(new Set(currentReportData.map(item => item.category))).map((category) => {
                        const items = currentReportData.filter(item => item.category === category);
                        const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
                        const maxValue = Math.max(...Array.from(new Set(currentReportData.map(item => item.category))).map(cat => 
                          currentReportData.filter(item => item.category === cat).reduce((sum, item) => sum + item.totalValue, 0)
                        ));
                        const percentage = (totalValue / maxValue) * 100;
                        
                        return (
                          <div key={category} className="bar-container">
                            <div className="bar" style={{height: `${percentage}%`}}>
                              <div className="bar-value">₱{totalValue.toFixed(0)}</div>
                            </div>
                            <div className="bar-label">{category}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {currentReport === 'usage' && (
                <div className="section">
                  <h2 className="section-title">Usage Analysis</h2>
                  <div className="graph-container">
                    <div className="graph-title">Consumption by Item</div>
                    <div className="bar-graph">
                      {Array.from(new Set(currentReportData.map(item => item.itemName))).map((itemName) => {
                        const total = currentReportData
                          .filter(item => item.itemName === itemName)
                          .reduce((sum, item) => sum + item.used, 0);
                        const maxUsage = Math.max(...Array.from(new Set(currentReportData.map(item => item.itemName))).map(name => 
                          currentReportData.filter(item => item.itemName === name).reduce((sum, item) => sum + item.used, 0)
                        ));
                        const percentage = (total / maxUsage) * 100;
                        
                        return (
                          <div key={itemName} className="bar-container">
                            <div className="bar" style={{height: `${percentage}%`}}>
                              <div className="bar-value">{total} units</div>
                            </div>
                            <div className="bar-label">{itemName}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {currentReport === 'valuation' && (
                <div className="section">
                  <h2 className="section-title">Value Distribution</h2>
                  <div className="graph-container">
                    <div className="graph-title">Value by Category</div>
                    <div className="bar-graph">
                      {Array.from(new Set(currentReportData.map(item => item.category))).map((category) => {
                        const totalValue = currentReportData
                          .filter(item => item.category === category)
                          .reduce((sum, item) => sum + item.totalValue, 0);
                        const maxValue = Math.max(...Array.from(new Set(currentReportData.map(item => item.category))).map(cat => 
                          currentReportData.filter(item => item.category === cat).reduce((sum, item) => sum + item.totalValue, 0)
                        ));
                        const percentage = (totalValue / maxValue) * 100;
                        
                        return (
                          <div key={category} className="bar-container">
                            <div className="bar" style={{height: `${percentage}%`}}>
                              <div className="bar-value">₱{totalValue.toFixed(0)}</div>
                            </div>
                            <div className="bar-label">{category}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Detailed Data Section */}
              <div className="section">
                <h2 className="section-title">Detailed Data</h2>
                <table className="data-table">
                  <thead>
                    <tr>
                      {currentReportData && currentReportData.length > 0 && Object.keys(currentReportData[0]).map(header => (
                        <th key={header}>{header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentReportData && currentReportData.map((item, index) => (
                      <tr key={index}>
                        {Object.values(item).map((value, i) => (
                          <td key={i}>{value?.toString()}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Footer */}
              <div className="footer">
                <p>&copy; {new Date().getFullYear()} Emiliano Restaurant - Inventory Management System</p>
                <p>Generated on: {new Date().toLocaleString()}</p>
              </div>
            </div>
            </div>
          </ScrollArea>
          
          <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t">
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Close</Button>
            <Button onClick={printReport} className="bg-restaurant-primary hover:bg-restaurant-primary/90">
              <Printer className="h-4 w-4 mr-2" /> Print Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
