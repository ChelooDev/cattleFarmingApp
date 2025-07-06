import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, CssBaseline, ListItemButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Tabs, Tab } from '@mui/material';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import MonitorWeightIcon from '@mui/icons-material/MonitorWeight';
import FenceIcon from '@mui/icons-material/Fence';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BackupIcon from '@mui/icons-material/Backup';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useStore } from './store';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Herd, Animal } from './store';
import { differenceInMonths, differenceInYears, parseISO } from 'date-fns';

const drawerWidth = 220;

const menuItems = [
  { text: 'Viehbestand', icon: <AgricultureIcon />, path: '/' },
  { text: 'Gewichtskontrolle', icon: <MonitorWeightIcon />, path: '/gewicht' },
  { text: 'Weide & Zaun', icon: <FenceIcon />, path: '/weide' },
  { text: 'Export & Backup', icon: <BackupIcon />, path: '/export' },
  { text: 'Einstellungen', icon: <SettingsIcon />, path: '/einstellungen' },
];

function Placeholder({ title }: { title: string }) {
  return <Box p={3}><Typography variant="h4">{title}</Typography><Typography variant="body1">Hier entsteht die Seite "{title}".</Typography></Box>;
}

function HerdenDashboard() {
  const herds = useStore(s => s.herds);
  const addHerd = useStore(s => s.addHerd);
  const updateHerd = useStore(s => s.updateHerd);
  const removeHerd = useStore(s => s.removeHerd);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const handleOpen = (herd?: Herd) => {
    if (herd) {
      setEditId(herd.id);
      setName(herd.name);
    } else {
      setEditId(null);
      setName('');
    }
    setOpen(true);
  };
  const handleSave = () => {
    if (editId) updateHerd(editId, { name });
    else addHerd({ name, animals: [] });
    setOpen(false);
  };
  const handleDelete = () => {
    if (deleteId) removeHerd(deleteId);
    setDeleteId(null);
  };
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Herdenübersicht</Typography>
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => handleOpen()}>Neue Herde</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Anzahl Tiere</TableCell>
              <TableCell>Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {herds.map(h => (
              <TableRow
                key={h.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/herde/${h.id}`)}
              >
                <TableCell>{h.name}</TableCell>
                <TableCell>{h.animals.length}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <IconButton onClick={e => { e.stopPropagation(); handleOpen(h); }} size="small"><EditIcon /></IconButton>
                  <IconButton onClick={e => { e.stopPropagation(); setDeleteId(h.id); }} size="small" color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editId ? 'Herde bearbeiten' : 'Neue Herde anlegen'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
          <TextField label="Name" value={name} onChange={e => setName(e.target.value)} fullWidth required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Herde löschen?</DialogTitle>
        <DialogContent>Willst du diese Herde wirklich löschen? Alle Tiere werden ebenfalls entfernt.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Abbrechen</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Löschen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ViehbestandList({ herd }: { herd: Herd }) {
  const herds = useStore(s => s.herds);
  const addAnimal = useStore((s) => s.addAnimal);
  const removeAnimal = useStore((s) => s.removeAnimal);
  const updateAnimal = useStore((s) => s.updateAnimal);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Animal>({
    id: '', breed: '', age: 0, gender: 'w', currentWeight: 0, birthDate: '', healthStatus: '', notes: '', weights: [], pasture: '', lastPastureChange: '', nextPastureChange: '', pastureNotes: '', vaccinations: [], treatments: [], reminders: []
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [targetHerd, setTargetHerd] = useState<string>('');
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterId, setFilterId] = useState('');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');
  const [filterWeightMin, setFilterWeightMin] = useState('');
  const [filterWeightMax, setFilterWeightMax] = useState('');
  // Filtered animals
  const filteredAnimals = herd.animals.filter(a => {
    if (filterId && !a.id.includes(filterId)) return false;
    if (filterAgeMin && a.age < Number(filterAgeMin)) return false;
    if (filterAgeMax && a.age > Number(filterAgeMax)) return false;
    if (filterWeightMin && a.currentWeight < Number(filterWeightMin)) return false;
    if (filterWeightMax && a.currentWeight > Number(filterWeightMax)) return false;
    return true;
  });
  const handleOpen = (animal?: Animal) => {
    if (animal) {
      setEditId(animal.id);
      setForm({ ...animal, gender: animal.gender as 'm' | 'w' });
    } else {
      setEditId(null);
      setForm({ id: '', breed: '', age: 0, gender: 'w', currentWeight: 0, birthDate: '', healthStatus: '', notes: '', weights: [], pasture: '', lastPastureChange: '', nextPastureChange: '', pastureNotes: '', vaccinations: [], treatments: [], reminders: [] });
    }
    setOpen(true);
  };
  const handleChange = (e: any) => {
    if (e.target.name === 'gender') {
      setForm(f => ({ ...f, gender: e.target.value as 'm' | 'w' }));
    } else {
      setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    }
  };
  const handleSave = () => {
    const gender = form.gender === 'm' ? 'm' : 'w';
    if (editId) updateAnimal(herd.id, editId, { ...form, gender });
    else addAnimal(herd.id, { ...form, gender, weights: [], vaccinations: [], treatments: [], reminders: [] });
    setOpen(false);
  };
  const handleDelete = () => {
    if (deleteId) removeAnimal(herd.id, deleteId);
    setDeleteId(null);
  };
  const handleMove = () => {
    if (!moveId || !targetHerd || targetHerd === herd.id) return;
    const animal = herd.animals.find(a => a.id === moveId);
    if (!animal) return;
    removeAnimal(herd.id, moveId);
    addAnimal(targetHerd, animal);
    setMoveId(null);
    setTargetHerd('');
  };
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Viehbestand von {herd.name}</Typography>
      <Button variant="outlined" sx={{ mb: 2 }} onClick={() => setShowFilters(f => !f)}>
        {showFilters ? 'Filter ausblenden' : 'Filter anzeigen'}
      </Button>
      {showFilters && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField label="ID" value={filterId} onChange={e => setFilterId(e.target.value)} size="small" />
          <TextField label="Alter min" value={filterAgeMin} onChange={e => setFilterAgeMin(e.target.value)} size="small" type="number" />
          <TextField label="Alter max" value={filterAgeMax} onChange={e => setFilterAgeMax(e.target.value)} size="small" type="number" />
          <TextField label="Gewicht min" value={filterWeightMin} onChange={e => setFilterWeightMin(e.target.value)} size="small" type="number" />
          <TextField label="Gewicht max" value={filterWeightMax} onChange={e => setFilterWeightMax(e.target.value)} size="small" type="number" />
        </Box>
      )}
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => handleOpen()}>Neues Tier</Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Rasse</TableCell>
              <TableCell>Alter</TableCell>
              <TableCell>Geschlecht</TableCell>
              <TableCell>Gewicht</TableCell>
              <TableCell>Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAnimals.map((a: Animal) => (
              <TableRow key={a.id}>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.breed}</TableCell>
                <TableCell>{a.age}</TableCell>
                <TableCell>{a.gender === 'm' ? 'Männlich' : 'Weiblich'}</TableCell>
                <TableCell>{a.currentWeight} kg</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(a)} size="small"><EditIcon /></IconButton>
                  <IconButton onClick={() => setDeleteId(a.id)} size="small" color="error"><DeleteIcon /></IconButton>
                  <Button variant="outlined" size="small" onClick={() => navigate(`/herde/${herd.id}/tier/${a.id}`)}>Details</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editId ? 'Tier bearbeiten' : 'Neues Tier anlegen'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
          <TextField label="ID" name="id" value={form.id} onChange={handleChange} fullWidth required disabled={!!editId} />
          <TextField label="Rasse" name="breed" value={form.breed} onChange={handleChange} fullWidth />
          <TextField label="Alter" name="age" value={form.age} onChange={handleChange} type="number" fullWidth />
          <TextField select label="Geschlecht" name="gender" value={form.gender} onChange={handleChange} fullWidth>
            <MenuItem value="m">Männlich</MenuItem>
            <MenuItem value="w">Weiblich</MenuItem>
          </TextField>
          <TextField label="Gewicht (kg)" name="currentWeight" value={form.currentWeight} onChange={handleChange} type="number" fullWidth />
          <TextField label="Geburtsdatum" name="birthDate" value={form.birthDate} onChange={handleChange} type="date" fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Notizen" name="notes" value={form.notes} onChange={handleChange} fullWidth multiline />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSave} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Tier löschen?</DialogTitle>
        <DialogContent>Willst du dieses Tier wirklich löschen?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Abbrechen</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Löschen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ViehbestandWrapper() {
  const { herdId } = useParams();
  const herd = useStore(s => s.herds.find(h => h.id === herdId));
  if (!herd) return <Typography>Herde nicht gefunden.</Typography>;
  return <ViehbestandList herd={herd} />;
}

function TierDetail() {
  const { herdId, id } = useParams();
  const herds = useStore((s) => s.herds);
  const herd = herds.find((h) => h.id === herdId);
  const animal = herd?.animals.find((a) => a.id === id);
  const updateAnimal = useStore((s) => s.updateAnimal);
  const addAnimal = useStore((s) => s.addAnimal);
  const removeAnimal = useStore((s) => s.removeAnimal);
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [tab, setTab] = useState(0);
  // Move animal state
  const [moveTarget, setMoveTarget] = useState('');
  if (!herd || !animal) return <Typography>Tier nicht gefunden.</Typography>;
  const handleAddWeight = () => {
    if (!weight || !date) return;
    updateAnimal(herd.id, animal.id, {
      weights: [...animal.weights, { date, weight: Number(weight) }],
      currentWeight: Number(weight),
    });
    setOpen(false);
    setWeight('');
    setDate('');
  };
  // Weide/Zaun
  const [pasture, setPasture] = useState(animal.pasture || '');
  const [lastPastureChange, setLastPastureChange] = useState(animal.lastPastureChange || '');
  const [nextPastureChange, setNextPastureChange] = useState(animal.nextPastureChange || '');
  const [pastureNotes, setPastureNotes] = useState(animal.pastureNotes || '');
  const savePasture = () => {
    updateAnimal(animal.id, { pasture, lastPastureChange, nextPastureChange, pastureNotes });
  };
  // Move animal handler
  const handleMove = () => {
    if (!moveTarget || moveTarget === herd.id) return;
    removeAnimal(herd.id, animal.id);
    addAnimal(moveTarget, animal);
    setMoveTarget('');
  };
  return (
    <Box>
      <Typography variant="h4">Tierdetails: {animal.id}</Typography>
      <Typography>Rasse: {animal.breed}</Typography>
      <Typography>Alter: {animal.age}</Typography>
      <Typography>Geschlecht: {animal.gender === 'm' ? 'Männlich' : 'Weiblich'}</Typography>
      <Typography>Gewicht: {animal.currentWeight} kg</Typography>
      <Box sx={{ my: 2 }}>
        <Typography variant="subtitle1">In andere Herde verschieben</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', maxWidth: 400 }}>
          <TextField
            select
            label="Zielherde"
            value={moveTarget}
            onChange={e => setMoveTarget(e.target.value)}
            size="small"
            fullWidth
          >
            {herds.filter(h => h.id !== herd.id).map(h => (
              <MenuItem key={h.id} value={h.id}>{h.name}</MenuItem>
            ))}
          </TextField>
          <Button onClick={handleMove} variant="contained" disabled={!moveTarget}>Verschieben</Button>
        </Box>
      </Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, mt: 2 }}>
        <Tab label="Gewicht" />
        <Tab label="Weide & Zaun" />
      </Tabs>
      {tab === 0 && (
        <Box>
          <Typography variant="h6">Gewichtsentwicklung</Typography>
          <Button variant="outlined" size="small" sx={{ mb: 2 }} onClick={() => { setOpen(true); setDate(new Date().toISOString().slice(0, 10)); }}>
            Neuen Wert eintragen
          </Button>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...animal.weights].sort((a, b) => a.date.localeCompare(b.date))} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit=" kg" />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#388e3c" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
          <Dialog open={open} onClose={() => setOpen(false)}>
            <DialogTitle>Neues Gewicht eintragen</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 300 }}>
              <TextField label="Datum" type="date" value={date} onChange={e => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Gewicht (kg)" type="number" value={weight} onChange={e => setWeight(e.target.value)} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpen(false)}>Abbrechen</Button>
              <Button onClick={handleAddWeight} variant="contained">Speichern</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
          <TextField label="Aktuelle Weide" value={pasture} onChange={e => setPasture(e.target.value)} />
          <TextField label="Letzter Wechsel" type="date" value={lastPastureChange} onChange={e => setLastPastureChange(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Nächster Wechsel" type="date" value={nextPastureChange} onChange={e => setNextPastureChange(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Bemerkungen" value={pastureNotes} onChange={e => setPastureNotes(e.target.value)} multiline />
          <Button onClick={savePasture} variant="contained">Speichern</Button>
        </Box>
      )}
    </Box>
  );
}

function ExportPage() {
  const herds = useStore(s => s.herds);
  const animals = useMemo(() => herds.flatMap(h => h.animals), [herds]);
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(animals.map(a => ({
      ID: a.id,
      Rasse: a.breed,
      Alter: a.age,
      Geschlecht: a.gender === 'm' ? 'Männlich' : 'Weiblich',
      Gewicht: a.currentWeight,
      Geburtsdatum: a.birthDate,
      Weide: a.pasture,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tiere');
    XLSX.writeFile(wb, 'viehbestand.xlsx');
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Viehbestand', 10, 10);
    (doc as any).autoTable({
      head: [[
        'ID', 'Rasse', 'Alter', 'Geschlecht', 'Gewicht', 'Geburtsdatum', 'Weide',
      ]],
      body: animals.map(a => [
        a.id, a.breed, a.age, a.gender === 'm' ? 'Männlich' : 'Weiblich', a.currentWeight, a.birthDate, a.pasture
      ]),
      startY: 20,
    });
    doc.save('viehbestand.pdf');
  };
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Export & Backup</Typography>
      <Button variant="contained" sx={{ mr: 2 }} onClick={exportExcel}>Export als Excel</Button>
      <Button variant="outlined" onClick={exportPDF}>Export als PDF</Button>
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Rasse</TableCell>
              <TableCell>Alter</TableCell>
              <TableCell>Geschlecht</TableCell>
              <TableCell>Gewicht</TableCell>
              <TableCell>Geburtsdatum</TableCell>
              <TableCell>Weide</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {animals.map(a => (
              <TableRow key={a.id}>
                <TableCell>{a.id}</TableCell>
                <TableCell>{a.breed}</TableCell>
                <TableCell>{a.age}</TableCell>
                <TableCell>{a.gender === 'm' ? 'Männlich' : 'Weiblich'}</TableCell>
                <TableCell>{a.currentWeight}</TableCell>
                <TableCell>{a.birthDate}</TableCell>
                <TableCell>{a.pasture}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function GewichtskontrollePage() {
  const herds = useStore(s => s.herds);
  const [selectedHerd, setSelectedHerd] = useState<Herd | null>(null);
  const now = new Date();
  // Helper: get all months in the last 3 years
  function getMonths() {
    const months = [];
    const date = new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < 36; i++) {
      months.unshift({
        label: date.toLocaleString('de-DE', { year: 'numeric', month: '2-digit' }),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      });
      date.setMonth(date.getMonth() - 1);
    }
    return months;
  }
  // For a herd, calculate avg weight per month
  function getAvgWeightData(herd: Herd) {
    const months = getMonths();
    return months.map(m => {
      // For each animal, find the latest weight in that month
      const weights = herd.animals.map(a => {
        const w = a.weights
          .map(w => ({ ...w, dateObj: parseISO(w.date) }))
          .filter(w => w.dateObj.getFullYear() === m.year && w.dateObj.getMonth() + 1 === m.month)
          .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        return w[0]?.weight;
      }).filter(Boolean);
      return {
        monat: m.label,
        gewicht: weights.length ? Math.round(weights.reduce((sum, w) => sum + w, 0) / weights.length) : null,
      };
    });
  }
  if (!selectedHerd) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Gewichtskontrolle</Typography>
        <Typography variant="subtitle1" gutterBottom>Bitte wähle eine Herde aus:</Typography>
        <TableContainer component={Paper} sx={{ maxWidth: 500 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Herde</TableCell>
                <TableCell>Anzahl Tiere</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {herds.map(h => (
                <TableRow
                  key={h.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelectedHerd(h)}
                >
                  <TableCell>{h.name}</TableCell>
                  <TableCell>{h.animals.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }
  // Show graph for selected herd
  const data = getAvgWeightData(selectedHerd);
  return (
    <Box>
      <Button variant="outlined" sx={{ mb: 2 }} onClick={() => setSelectedHerd(null)}>Zurück</Button>
      <Typography variant="h4" gutterBottom>Gewichtsentwicklung: {selectedHerd.name}</Typography>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monat" />
          <YAxis unit=" kg" />
          <Tooltip />
          <Line type="monotone" dataKey="gewicht" stroke="#388e3c" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}

export default function App() {
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            ViehKontrolle
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton component={Link} to={item.path}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Toolbar />
        <Routes>
          <Route path="/" element={<HerdenDashboard />} />
          <Route path="/herde/:herdId" element={<ViehbestandWrapper />} />
          <Route path="/herde/:herdId/tier/:id" element={<TierDetail />} />
          <Route path="/gewicht" element={<GewichtskontrollePage />} />
          <Route path="/weide" element={<Placeholder title="Weide & Zaun" />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/einstellungen" element={<Placeholder title="Einstellungen" />} />
        </Routes>
      </Box>
    </Box>
  );
}
