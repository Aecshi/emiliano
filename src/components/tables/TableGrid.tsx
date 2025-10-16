import React, { useState, useRef } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/useToast';
import { Calendar } from '@/components/ui/calendar';
import { format, formatDistance, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, MoreHorizontal, Users, CheckCircle, Clock4, UserPlus, X, Edit, Trash2, ChevronsUp, Split, Combine } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTables, updateTable, createTable, deleteTable, joinTables, separateTables, type Table, type JoinTablesRequest, type SeparateTablesRequest } from '@/lib/api';

// Add CSS for the table grid layout
import './TableGrid.css';

const TableGrid = () => {
  const queryClient = useQueryClient();
  
  // Fetch tables from API
  const { data: tables = [], isLoading, error } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: getTables,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Mutations for table operations
  const updateTableMutation = useMutation({
    mutationFn: ({ tableId, data }: { tableId: number; data: Partial<Table> }) => 
      updateTable(tableId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const createTableMutation = useMutation({
    mutationFn: ({ number, capacity }: { number: number; capacity: number }) => 
      createTable(number, capacity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (tableId: number) => deleteTable(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });

  const joinTablesMutation = useMutation({
    mutationFn: joinTables,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const separateTablesMutation = useMutation({
    mutationFn: separateTables,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
  
  // States for additional dialogs
  const [quickSeatOpen, setQuickSeatOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [quickSeatGuests, setQuickSeatGuests] = useState('');
  const [joinTablesOpen, setJoinTablesOpen] = useState(false);
  const [tablesToJoin, setTablesToJoin] = useState<number[]>([]);

  const getTableColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-restaurant-danger/10 border-restaurant-danger text-restaurant-danger';
      case 'reserved':
        return 'bg-restaurant-warning/10 border-restaurant-warning text-restaurant-warning';
      case 'available':
        return 'bg-restaurant-success/10 border-restaurant-success text-restaurant-success';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };
  
  // Calculate how long a table has been seated
  const calculateSeatedTime = (seatedTime: string) => {
    try {
      const seatedDate = parseISO(seatedTime);
      const now = new Date();
      return `Seated for ${formatDistance(seatedDate, now, { addSuffix: false })}`;
    } catch (error) {
      return 'Seated recently';
    }
  };

  const { toast } = useToast();
  
  // Table action states
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableActionOpen, setTableActionOpen] = useState(false);
  const [newTableOpen, setNewTableOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  
  // Reservation states
  const [selectedStatus, setSelectedStatus] = useState<'available' | 'occupied' | 'reserved'>('available');
  const [guestCount, setGuestCount] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [timeValue, setTimeValue] = useState('');
  
  // Handle opening table action dialog
  const handleTableClick = (table: Table, e: React.MouseEvent) => {
    // If the click is coming from a button in the table card, don't open the dialog
    if ((e.target as HTMLElement).closest('button')) {
      e.stopPropagation();
      return;
    }
    
    setSelectedTable(table);
    setSelectedStatus(table.status);
    setGuestCount(table.guests ? String(table.guests) : '');
    setDate(table.reservationDate || null);
    setTimeValue(table.reservationTime || '');
    setTableActionOpen(true);
  };
  
  // Quick action handlers
  const handleQuickSeat = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTable(table);
    setQuickSeatGuests('');
    setQuickSeatOpen(true);
  };
  
  const confirmQuickSeat = async () => {
    if (!selectedTable || !quickSeatGuests) return;
    
    const guestCount = parseInt(quickSeatGuests);
    
    try {
      await updateTableMutation.mutateAsync({
        tableId: selectedTable.id,
        data: {
          status: 'occupied',
          guests: guestCount
      }
    });
    
    setQuickSeatOpen(false);
    
    toast({
      title: "Table Seated",
      description: `Table ${selectedTable.number} has been seated with ${guestCount} guests`
    });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to seat guests",
        variant: "destructive"
      });
    }
  };
  
  const handleQuickFree = async (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await updateTableMutation.mutateAsync({
        tableId: table.id,
        data: {
          status: 'available',
          guests: null
      }
    });
    
    toast({
      title: "Table Freed",
      description: `Table ${table.number} is now available`
    });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to free table",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteTable = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTable(table);
    setDeleteConfirmOpen(true);
  };
  
  const confirmDeleteTable = async () => {
    if (!selectedTable) return;
    
    try {
      await deleteTableMutation.mutateAsync(selectedTable.id);
    setDeleteConfirmOpen(false);
    
    // Table removed successfully
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete table",
        variant: "destructive"
      });
    }
  };
  
  const handleMarkPriority = (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // For now, just a placeholder - priority could be implemented as a database field later
    // Priority set for table
  };
  
  // Join Tables functionality
  const handleOpenJoinTables = () => {
    setTablesToJoin([]);
    setJoinTablesOpen(true);
  };
  
  const toggleTableSelection = (tableNumber: number) => {
    setTablesToJoin(prev => {
      if (prev.includes(tableNumber)) {
        return prev.filter(t => t !== tableNumber);
      } else {
        return [...prev, tableNumber];
      }
    });
  };
  
  const handleJoinTables = async () => {
    if (tablesToJoin.length < 2) {
      toast({
        title: "Selection Error",
        description: "Please select at least two tables to join."
      });
      return;
    }
    
    try {
      const response = await joinTablesMutation.mutateAsync({
        tableIds: tablesToJoin
      });
      
    setJoinTablesOpen(false);
      setTablesToJoin([]);
    
    // Tables joined successfully
    } catch (error) {
      toast({
        title: "Join Tables Failed",
        description: error instanceof Error ? error.message : "Failed to join tables. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleUnjoinTable = async (table: Table, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await separateTablesMutation.mutateAsync({
        tableIds: [table.id]
      });
      
      // Table separated successfully
    } catch (error) {
        toast({
        title: "Separation Failed", 
        description: error instanceof Error ? error.message : "Failed to separate table. Please try again.",
        variant: "destructive"
        });
    }
  };
  
  // Handle saving table status changes
  const handleSaveTableChanges = async () => {
    if (!selectedTable) return;
    
    // Validate required fields for reserved status
    if (selectedStatus === 'reserved') {
      if (!date) {
        toast({
          title: "Date Required",
          description: "Please select a reservation date"
        });
        return;
      }
      if (!timeValue) {
        toast({
          title: "Time Required",
          description: "Please enter a reservation time"
        });
        return;
      }
    }
    
    try {
      await updateTableMutation.mutateAsync({
        tableId: selectedTable.id,
        data: {
          status: selectedStatus,
          guests: guestCount ? parseInt(guestCount) : null,
          reservationDate: selectedStatus === 'reserved' ? date : undefined,
          reservationTime: selectedStatus === 'reserved' ? timeValue : undefined
      }
    });
    
    setTableActionOpen(false);
    
    let statusMessage = '';
    switch(selectedStatus) {
      case 'available':
        statusMessage = 'marked as available';
        break;
      case 'occupied':
        statusMessage = 'marked as occupied';
        break;
      case 'reserved':
        statusMessage = `reserved for ${format(date!, 'PPP')} at ${timeValue}`;
        break;
    }
    
    toast({
      title: "Table Updated",
      description: `Table ${selectedTable.number} ${statusMessage}`
    });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update table",
        variant: "destructive"
      });
    }
  };
  
  // Handle adding a new table
  const handleAddNewTable = async () => {
    if (!newTableNumber || isNaN(parseInt(newTableNumber))) {
      toast({
        title: "Invalid Table Number",
        description: "Please enter a valid table number"
      });
      return;
    }
    
    const tableNumber = parseInt(newTableNumber);
    
    try {
      await createTableMutation.mutateAsync({ 
      number: tableNumber,
        capacity: 4 // Default capacity
      });
      
    setNewTableOpen(false);
    setNewTableNumber('');
    
    toast({
      title: "Table Added",
      description: `Table ${tableNumber} has been added`
    });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add table",
        variant: "destructive"
      });
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-restaurant-primary mx-auto mb-2"></div>
          <p className="text-gray-600">Loading tables...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-2">Failed to load tables</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['tables'] })}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Table Management</h2>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="bg-purple-600 text-white hover:bg-purple-700"
            onClick={handleOpenJoinTables}
            disabled={isLoading}
          >
            <Combine className="h-4 w-4 mr-2" />
            Join Tables
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="bg-restaurant-success text-white hover:bg-restaurant-success/80"
            onClick={() => setNewTableOpen(true)}
            disabled={isLoading}
          >
            New Table
          </Button>
        </div>
      </div>

      <div className="table-grid">
        {tables.map((table) => (
          <Card 
            key={table.id} 
            className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${
              table.isJoined 
                ? 'bg-purple-50/50 border-purple-400 text-purple-900' 
                : getTableColor(table.status)
            } relative group`}
            onClick={(e) => handleTableClick(table, e)}
          >
            {/* Context Menu */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTableClick(table, e as any);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit Table</span>
                  </DropdownMenuItem>
                  
                  {table.status === 'available' && (
                    <DropdownMenuItem onClick={(e) => handleQuickSeat(table, e as any)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Quick Seat</span>
                    </DropdownMenuItem>
                  )}
                  
                  {table.status !== 'available' && (
                    <DropdownMenuItem onClick={(e) => handleQuickFree(table, e as any)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      <span>Free Table</span>
                    </DropdownMenuItem>
                  )}
                  
                  {table.status === 'occupied' && (
                    <DropdownMenuItem onClick={(e) => handleMarkPriority(table, e as any)}>
                      <ChevronsUp className="mr-2 h-4 w-4" />
                      <span>Mark Priority</span>
                    </DropdownMenuItem>
                  )}
                  
                  {/* Join/Unjoin options */}
                  {(table.joinedWith && table.joinedWith.length > 0) || table.isJoined ? (
                    <DropdownMenuItem onClick={(e) => handleUnjoinTable(table, e as any)}>
                      <Split className="mr-2 h-4 w-4" />
                      <span>Separate Table{table.joinedWith && table.joinedWith.length > 1 ? 's' : ''}</span>
                    </DropdownMenuItem>
                  ) : (
                    table.status === 'available' && (
                      <DropdownMenuItem onClick={handleOpenJoinTables}>
                        <Combine className="mr-2 h-4 w-4" />
                        <span>Join Tables</span>
                      </DropdownMenuItem>
                    )
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    className="text-red-500 focus:text-red-500" 
                    onClick={(e) => handleDeleteTable(table, e as any)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Table</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <CardContent className="p-4 text-center pb-2">
              <div className="flex justify-between items-start mb-2">
                <div>
                  {table.isJoined && Array.isArray(table.number) ? (
                    <>
                      <Badge variant="outline" className="mb-1 bg-purple-50 border-purple-300 text-purple-700">
                        #Tables {table.number.join(' + ')}
                      </Badge>
                      <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800 border-purple-300">
                        <Combine className="h-3 w-3 mr-1" />
                        Joined
                      </Badge>
                    </>
                  ) : (
                    <>
                  <Badge variant="outline" className="mb-1">
                    #{table.number}
                  </Badge>
                      {table.isJoined && table.joinedTableGroup && (
                    <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800 border-purple-300">
                          <Combine className="h-3 w-3 mr-1" />
                          Joined
                    </Badge>
                  )}
                    </>
                  )}
                </div>
                <Badge 
                  variant={table.status === 'available' ? 'outline' : table.status === 'occupied' ? 'destructive' : 'default'}
                  className="capitalize"
                >
                  {table.status}
                </Badge>
              </div>
              
              <h3 className="text-lg font-semibold">
                {table.isJoined && table.combinedName 
                  ? table.combinedName 
                  : `Table ${Array.isArray(table.number) ? table.number.join(' + ') : table.number}`}
              </h3>
              
              {table.status === 'occupied' && table.seatedTime && (
                <div className="flex items-center justify-center text-sm mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    {calculateSeatedTime(table.seatedTime)}
                  </span>
                </div>
              )}
              {table.status === 'reserved' && table.time && (
                <div className="flex items-center justify-center text-sm mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    Reserved for {table.time}
                  </span>
                </div>
              )}
              
              {table.guests && (
                <div className="flex items-center justify-center text-sm mt-1">
                  <Users className="h-3 w-3 mr-1" />
                  <span>{table.guests} guests</span>
                </div>
              )}
              
              {table.isJoined && table.capacity && (
                <div className="flex items-center justify-center text-sm mt-1 text-purple-700">
                  <Users className="h-3 w-3 mr-1" />
                  <span>Total: {table.capacity} seats</span>
                </div>
              )}
              
              {table.status === 'occupied' && table.orders !== undefined && (
                <div className="mt-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span>Orders:</span>
                    <span>{table.orders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Bill:</span>
                    <span>₱{table.billAmount?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="p-2 pt-0 flex justify-center gap-2">
              {table.status === 'available' && (
                <Button 
                  size="sm" 
                  className="w-full bg-restaurant-success hover:bg-restaurant-success/80 text-white" 
                  onClick={(e) => handleQuickSeat(table, e)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Seat
                </Button>
              )}
              
              {table.status === 'occupied' && (
                <Button 
                  size="sm" 
                  className="w-full bg-restaurant-accent hover:bg-restaurant-accent/80 text-white" 
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to the orders page with the table ID as a query parameter
                    window.location.href = `/orders?table=${table.id}`;
                  }}
                >
                  View Orders
                </Button>
              )}
              
              {(table.status === 'occupied' || table.status === 'reserved') && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full" 
                  onClick={(e) => handleQuickFree(table, e)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Free
                </Button>
              )}
              
              {table.isJoined && table.joinedTableGroup && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full border-purple-300 text-purple-700 hover:bg-purple-50" 
                  onClick={(e) => handleUnjoinTable(table, e)}
                  disabled={separateTablesMutation.isPending}
                >
                  <Split className="h-4 w-4 mr-1" />
                  {separateTablesMutation.isPending ? 'Separating...' : 'Separate'}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Table Action Dialog */}
      <Dialog open={tableActionOpen} onOpenChange={setTableActionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Table {selectedTable?.number}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label className="mb-2 block">Table Status</Label>
              <RadioGroup 
                value={selectedStatus} 
                onValueChange={(value) => setSelectedStatus(value as 'available' | 'occupied' | 'reserved')}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="available" id="available" />
                  <Label htmlFor="available" className="font-normal text-green-600">Available</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="occupied" id="occupied" />
                  <Label htmlFor="occupied" className="font-normal text-red-600">Occupied</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reserved" id="reserved" />
                  <Label htmlFor="reserved" className="font-normal text-amber-600">Reserved</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="guests" className="text-right">
                Guests
              </Label>
              <Input
                id="guests"
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="col-span-3"
                min="1"
                placeholder="Number of guests"
                disabled={selectedStatus === 'available'}
              />
            </div>
            
            {selectedStatus === 'reserved' && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Date
                  </Label>
                  <div className="col-span-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date || undefined}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="time" className="text-right">
                    Time
                  </Label>
                  <div className="relative col-span-3">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="time"
                      value={timeValue}
                      onChange={(e) => setTimeValue(e.target.value)}
                      className="pl-10"
                      placeholder="e.g. 7:30 PM"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableActionOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTableChanges} 
              className="bg-restaurant-primary hover:bg-restaurant-primary/80"
              disabled={updateTableMutation.isPending}
            >
              {updateTableMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* New Table Dialog */}
      <Dialog open={newTableOpen} onOpenChange={setNewTableOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="table-number" className="text-right">
                Table Number
              </Label>
              <Input
                id="table-number"
                type="number"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                className="col-span-3"
                min="1"
                placeholder="Enter table number"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTableOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddNewTable} 
              className="bg-restaurant-primary hover:bg-restaurant-primary/80"
              disabled={createTableMutation.isPending}
            >
              {createTableMutation.isPending ? 'Adding...' : 'Add Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Quick Seat Dialog */}
      <Dialog open={quickSeatOpen} onOpenChange={setQuickSeatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Seat - Table {selectedTable?.number}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quick-guests" className="text-right">
                Number of Guests
              </Label>
              <Input
                id="quick-guests"
                type="number"
                value={quickSeatGuests}
                onChange={(e) => setQuickSeatGuests(e.target.value)}
                className="col-span-3"
                min="1"
                placeholder="Enter number of guests"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickSeatOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmQuickSeat} 
              className="bg-restaurant-success hover:bg-restaurant-success/80 text-white"
              disabled={!quickSeatGuests || updateTableMutation.isPending}
            >
              {updateTableMutation.isPending ? 'Seating...' : 'Seat Guests'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Table {selectedTable?.number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTable}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={deleteTableMutation.isPending}
            >
              {deleteTableMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Join Tables Dialog */}
      <Dialog open={joinTablesOpen} onOpenChange={setJoinTablesOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Join Tables</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="mb-4">Select two or more available tables to join them together. Joined tables will be treated as one table for ordering and billing purposes.</p>
            
            <div className="grid grid-cols-5 gap-2 mb-4">
              {tables
                .filter(table => table.status === 'available' && !table.isJoined)
                .map(table => (
                  <Button
                    key={table.id}
                    variant={tablesToJoin.includes(table.number) ? 'default' : 'outline'}
                    className={tablesToJoin.includes(table.number) ? 'bg-purple-600' : ''}
                    onClick={() => toggleTableSelection(table.number)}
                  >
                    {table.number}
                  </Button>
                ))}
            </div>
            
            {tablesToJoin.length > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-md mb-4">
                <p className="font-medium text-purple-800">Selected Tables: {tablesToJoin.join(', ')}</p>
                <p className="text-sm text-purple-600 mt-1">
                  Table {Math.min(...tablesToJoin)} will be the primary table.
                </p>
              </div>
            )}
            
            {tables.filter(table => table.status === 'available' && !table.isJoined).length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <p>No available tables to join. Tables must be available (not occupied or reserved) to be joined.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinTablesOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleJoinTables}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={tablesToJoin.length < 2 || joinTablesMutation.isPending}
            >
              <Combine className="mr-2 h-4 w-4" />
              {joinTablesMutation.isPending ? 'Joining...' : 'Join Tables'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableGrid;
