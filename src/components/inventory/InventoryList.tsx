import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Edit, Trash2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  status: string;
  lastUpdated: string;
}

const InventoryList = () => {
  // Mock data for inventory items
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([
    { 
      id: 'INV001', 
      name: 'Tomatoes', 
      category: 'Vegetables',
      quantity: 25,
      unit: 'kg',
      unitPrice: 120.50,
      totalValue: 3012.50,
      status: 'In Stock',
      lastUpdated: '2023-04-01'
    },
    { 
      id: 'INV002', 
      name: 'Chicken Breast', 
      category: 'Meat',
      quantity: 15,
      unit: 'kg',
      unitPrice: 280.00,
      totalValue: 4200.00,
      status: 'In Stock',
      lastUpdated: '2023-04-02'
    },
    { 
      id: 'INV003', 
      name: 'Olive Oil', 
      category: 'Condiments',
      quantity: 8,
      unit: 'bottles',
      unitPrice: 350.00,
      totalValue: 2800.00,
      status: 'In Stock',
      lastUpdated: '2023-04-01'
    },
    { 
      id: 'INV004', 
      name: 'Flour', 
      category: 'Dry Goods',
      quantity: 10,
      unit: 'kg',
      unitPrice: 85.50,
      totalValue: 855.00,
      status: 'Low Stock',
      lastUpdated: '2023-04-02'
    },
    { 
      id: 'INV005', 
      name: 'Mozzarella Cheese', 
      category: 'Dairy',
      quantity: 5,
      unit: 'kg',
      unitPrice: 420.00,
      totalValue: 2100.00,
      status: 'Low Stock',
      lastUpdated: '2023-04-03'
    },
  ]);

  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Vegetables', 'Meat', 'Dairy', 'Dry Goods', 'Condiments'];

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
  const [editedItem, setEditedItem] = useState<Partial<InventoryItem>>({});
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    category: 'Vegetables',
    quantity: 1,
    unit: 'kg',
    unitPrice: 0,
    status: 'In Stock'
  });
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-restaurant-success/10 text-restaurant-success';
      case 'Low Stock':
        return 'bg-restaurant-warning/10 text-restaurant-warning';
      case 'Out of Stock':
        return 'bg-restaurant-danger/10 text-restaurant-danger';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Handle opening edit dialog
  const handleEditClick = (item: InventoryItem) => {
    setCurrentItem(item);
    setEditedItem({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      status: item.status
    });
    setEditDialogOpen(true);
  };
  
  // Handle opening add dialog
  const handleAddClick = () => {
    setNewItem({
      name: '',
      category: 'Vegetables',
      quantity: 1,
      unit: 'kg',
      unitPrice: 0,
      status: 'In Stock'
    });
    setAddDialogOpen(true);
  };

  // Handle saving new item
  const handleSaveNewItem = () => {
    if (!newItem.name || !newItem.category) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields."
      });
      return;
    }
    
    // Calculate the new total value
    const quantity = newItem.quantity || 0;
    const unitPrice = newItem.unitPrice || 0;
    const totalValue = quantity * unitPrice;
    
    // Generate a new ID
    const lastId = parseInt(inventoryItems[inventoryItems.length - 1].id.replace('INV', ''));
    const newId = `INV${String(lastId + 1).padStart(3, '0')}`;
    
    // Create the new item
    const itemToAdd: InventoryItem = {
      id: newId,
      name: newItem.name || '',
      category: newItem.category || 'Vegetables',
      quantity: quantity,
      unit: newItem.unit || 'kg',
      unitPrice: unitPrice,
      totalValue: totalValue,
      status: newItem.status || 'In Stock',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    // Add to inventory items
    setInventoryItems([...inventoryItems, itemToAdd]);
    setAddDialogOpen(false);
    
    toast({
      title: "Item Added",
      description: `${newItem.name} has been added to inventory.`
    });
  };
  
  // Handle saving edited item
  const handleSaveEdit = () => {
    if (!currentItem || !editedItem.name || !editedItem.category) {
      toast({
        title: "Missing Information",
        description: "Please fill out all required fields."
      });
      return;
    }
    
    // Calculate the new total value
    const quantity = editedItem.quantity || 0;
    const unitPrice = editedItem.unitPrice || 0;
    const totalValue = quantity * unitPrice;
    
    // Update the inventory items
    const updatedItems = inventoryItems.map(item => {
      if (item.id === currentItem.id) {
        return {
          ...item,
          ...editedItem,
          totalValue,
          lastUpdated: new Date().toISOString().split('T')[0]
        } as InventoryItem;
      }
      return item;
    });
    
    setInventoryItems(updatedItems);
    setEditDialogOpen(false);
    setCurrentItem(null);
    
    toast({
      title: "Item Updated",
      description: `${editedItem.name} has been updated successfully.`
    });
  };
  
  const filteredItems = activeCategory === 'All' 
    ? inventoryItems 
    : inventoryItems.filter(item => item.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Inventory Items</h2>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search inventory..."
              className="pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-restaurant-primary focus:border-transparent"
            />
          </div>
          <Button 
            className="bg-restaurant-primary hover:bg-restaurant-primary/80"
            onClick={handleAddClick}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      <div className="mb-4 flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            className={activeCategory === category ? "bg-restaurant-primary hover:bg-restaurant-primary/80" : ""}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1">
        {filteredItems.map((item) => (
          <Card key={item.id} className="border-l-4 border-l-restaurant-primary">
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                <span className={`text-sm font-medium py-1 px-2 rounded-full ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Item #{item.id}</span>
                <span>Last updated: {item.lastUpdated}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-2 gap-y-2 mb-4">
                <div className="text-sm">
                  <span className="font-medium">Category: </span>
                  {item.category}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Quantity: </span>
                  {item.quantity} {item.unit}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Unit Price: </span>
                  ₱{item.unitPrice.toFixed(2)}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Total Value: </span>
                  ₱{item.totalValue.toFixed(2)}
                </div>
              </div>

              <Separator className="my-2" />

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleEditClick(item)}
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" className="flex-1 text-restaurant-danger hover:bg-restaurant-danger/10 hover:text-restaurant-danger">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Inventory Item</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-name"
                value={newItem.name || ''}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className="col-span-3"
                placeholder="Item name"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-category" className="text-right">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={newItem.category}
                onValueChange={(value) => setNewItem({...newItem, category: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c !== 'All').map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-quantity" className="text-right">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-quantity"
                type="number"
                value={newItem.quantity?.toString() || '1'}
                onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value)})}
                className="col-span-2"
              />
              <Select 
                value={newItem.unit}
                onValueChange={(value) => setNewItem({...newItem, unit: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="liters">liters</SelectItem>
                  <SelectItem value="bottles">bottles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-unit-price" className="text-right">
                Unit Price (₱) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-unit-price"
                type="number"
                value={newItem.unitPrice?.toString() || '0'}
                onChange={(e) => setNewItem({...newItem, unitPrice: parseFloat(e.target.value)})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-status" className="text-right">
                Status
              </Label>
              <Select 
                value={newItem.status}
                onValueChange={(value) => setNewItem({...newItem, status: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Low Stock">Low Stock</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-total-value" className="text-right">
                Total Value (₱)
              </Label>
              <Input
                id="new-total-value"
                value={((newItem.quantity || 0) * (newItem.unitPrice || 0)).toFixed(2)}
                className="col-span-3"
                disabled
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewItem} className="bg-restaurant-primary hover:bg-restaurant-primary/80">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item-id" className="text-right">
                Item ID
              </Label>
              <Input
                id="item-id"
                value={currentItem?.id || ''}
                className="col-span-3"
                disabled
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={editedItem.name || ''}
                onChange={(e) => setEditedItem({...editedItem, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select 
                value={editedItem.category}
                onValueChange={(value) => setEditedItem({...editedItem, category: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c !== 'All').map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                value={editedItem.quantity?.toString() || ''}
                onChange={(e) => setEditedItem({...editedItem, quantity: parseFloat(e.target.value)})}
                className="col-span-2"
              />
              <Select 
                value={editedItem.unit}
                onValueChange={(value) => setEditedItem({...editedItem, unit: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="liters">liters</SelectItem>
                  <SelectItem value="bottles">bottles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit-price" className="text-right">
                Unit Price (₱)
              </Label>
              <Input
                id="unit-price"
                type="number"
                value={editedItem.unitPrice?.toString() || ''}
                onChange={(e) => setEditedItem({...editedItem, unitPrice: parseFloat(e.target.value)})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select 
                value={editedItem.status}
                onValueChange={(value) => setEditedItem({...editedItem, status: value})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Low Stock">Low Stock</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="total-value" className="text-right">
                Total Value (₱)
              </Label>
              <Input
                id="total-value"
                value={((editedItem.quantity || 0) * (editedItem.unitPrice || 0)).toFixed(2)}
                className="col-span-3"
                disabled
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-restaurant-primary hover:bg-restaurant-primary/80">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryList;