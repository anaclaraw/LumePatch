import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Alert,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  MenuItem,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Fab,
    useMediaQuery,
  Tooltip
} from "@mui/material";
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Legend, ResponsiveContainer, Cell,
  CartesianGrid
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Inventory,
  Warning,
  CalendarToday,
  FilterList,
  Refresh,
  Download,
  Speed,
  Sensors,
  PrecisionManufacturing
} from "@mui/icons-material";
import { theme } from "./theme";

// Paleta de cores consistente
const COLORS = ["#1565c0", "#42a5f5", "#81d4fa", "#29b6f6", "#4fc3f7",
  "#ffb300", "#ffa000", "#ff8f00", "#ef5350", "#f44336",
  "#66bb6a", "#4caf50", "#2e7d32"];


// Simulador de dados IoT
const IoTDataSimulator = {
  getRealTimeMetrics: () => ({
    temperature: 22 + Math.random() * 3,
    humidity: 45 + Math.random() * 10,
    detectionAccuracy: 0.85 + Math.random() * 0.1,
    processingSpeed: 120 + Math.random() * 50,
    cameraStatus: Math.random() > 0.1 ? 'optimal' : 'warning',
    networkLatency: 25 + Math.random() * 20
  }),

  getEquipmentHealth: () => [
    { name: 'Câmera Principal', status: 'optimal', uptime: 99.8 },
    { name: 'Servidor IA', status: 'optimal', uptime: 99.9 },
    { name: 'Sensores IoT', status: 'warning', uptime: 95.2 },
    { name: 'Rede', status: 'optimal', uptime: 99.5 }
  ]
};

export default function Dashboard() {
  const [stock, setStock] = useState({});
  const [detections, setDetections] = useState([]);
  const [timeRange, setTimeRange] = useState("7"); // 7, 30, 90, 365
  const [refreshKey, setRefreshKey] = useState(0);
  const [realTimeData, setRealTimeData] = useState({});
  const [equipmentHealth, setEquipmentHealth] = useState([]);
  const [exportDialog, setExportDialog] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // Carregar dados do localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const stockData = JSON.parse(localStorage.getItem("stock")) || {};
        const detectionData = JSON.parse(localStorage.getItem("savedDetections") || "[]");
        setStock(stockData);
        setDetections(detectionData);

        // Atualizar dados IoT em tempo real
        setRealTimeData(IoTDataSimulator.getRealTimeMetrics());
        setEquipmentHealth(IoTDataSimulator.getEquipmentHealth());
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    };

    loadData();
    // Atualizar a cada 10 segundos para dados em tempo real
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  // Processar dados para os gráficos
  const {
    consumptionData,
    stockData,
    trendData,
    alerts,
    statistics,
    recentDetections
  } = useMemo(() => {
    const now = new Date();
    const timeRangeMs = parseInt(timeRange) * 24 * 60 * 60 * 1000;
    const startDate = new Date(now.getTime() - timeRangeMs);

    // Filtrar detecções pelo período selecionado
    const filteredDetections = detections.filter(detection =>
      new Date(detection.ts) >= startDate
    );

    // Calcular consumo por item
    const consumptionByItem = filteredDetections.reduce((acc, detection) => {
      const item = detection.label.toLowerCase();
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});

    // Dados para gráfico de barras (consumo)
    const consumptionData = Object.entries(consumptionByItem)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        consumo: value,
        estoque: stock[name] || 0
      }))
      .sort((a, b) => b.consumo - a.consumo);

    // Dados para gráfico de pizza (distribuição do consumo)
    const stockData = Object.entries(stock)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        percent: (value / Object.values(stock).reduce((a, b) => a + b, 0)) * 100
      }))
      .sort((a, b) => b.value - a.value);

    // Dados para tendência temporal (consumo por dia)
    const dailyConsumption = filteredDetections.reduce((acc, detection) => {
      const date = new Date(detection.ts).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const trendData = Object.entries(dailyConsumption)
      .map(([date, count]) => ({ date, consumo: count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Alertas de estoque
    const alerts = Object.entries(stock)
      .filter(([name, quantity]) => quantity <= 5)
      .map(([name, quantity]) => ({
        item: name,
        quantity,
        severity: quantity === 0 ? "error" : "warning",
        message: quantity === 0
          ? `${name} está esgotado`
          : `${name} está com estoque baixo (${quantity} unidades)`
      }));

    // Estatísticas gerais
    const totalStock = Object.values(stock).reduce((a, b) => a + b, 0);
    const totalConsumption = filteredDetections.length;
    const avgDailyConsumption = trendData.length > 0
      ? totalConsumption / trendData.length
      : 0;

    const mostConsumed = consumptionData.length > 0 ? consumptionData[0] : null;
    const criticalItems = alerts.filter(alert => alert.severity === "error").length;

    const statistics = {
      totalStock,
      totalConsumption,
      avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
      mostConsumed: mostConsumed ? `${mostConsumed.name} (${mostConsumed.consumo})` : "N/A",
      criticalItems,
      periodDetections: filteredDetections.length,
      uniqueItems: Object.keys(consumptionByItem).length,
      // NOVO: Precisão da IA baseada nas detecções
      aiAccuracy: filteredDetections.length > 0
        ? (filteredDetections.reduce((sum, det) => sum + det.score, 0) / filteredDetections.length * 100).toFixed(1) + '%'
        : 'N/A',
      systemUptime: equipmentHealth.reduce((acc, eq) => acc + eq.uptime, 0) / equipmentHealth.length
    };

    // Detecções recentes (últimas 5)
    const recentDetections = detections
      .slice(0, 5)
      .map(detection => ({
        ...detection,
        date: new Date(detection.ts).toLocaleString()
      }));

    return {
      consumptionData,
      stockData,
      trendData,
      alerts,
      statistics,
      recentDetections
    };
  }, [stock, detections, timeRange, equipmentHealth]);

  // Função para exportar dados para CSV
  const exportToCSV = () => {
    const csvContent = [
      ['Item', 'Consumo', 'Estoque Atual', 'Data Exportação'],
      ...consumptionData.map(item => [
        item.name,
        item.consumo,
        item.estoque,
        new Date().toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDialog(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper elevation={3} sx={{ p: 2, background: 'rgba(255, 255, 255, 0.95)' }}>
          <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" color={entry.color}>
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  const ExportDialog = () => (
    <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Download sx={{ mr: 1, verticalAlign: 'middle' }} />
        Exportar Dados do Dashboard
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Exportar dados completos do dashboard para análise externa?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Será gerado um arquivo CSV com:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="• Consumo por item" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Estoque atual" />
          </ListItem>
          <ListItem>
            <ListItemText primary="• Métricas de performance" />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExportDialog(false)}>Cancelar</Button>
        <Button onClick={exportToCSV} variant="contained" startIcon={<Download />}>
          Exportar CSV
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 1, width:isMobile ? '100vw' : '100%'}}>
      {/* Cabeçalho e Filtros */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Dashboard Analítico
        </Typography>
        <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Download sx={{ mr: 1, verticalAlign: 'middle' }} />
            Exportar Dados do Dashboard
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Exportar dados completos do dashboard para análise externa?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Será gerado um arquivo CSV com:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="• Consumo por item" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Estoque atual" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Métricas de performance" />
              </ListItem>
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportDialog(false)}>Cancelar</Button>
            <Button onClick={exportToCSV} variant="contained" startIcon={<Download />}>
              Exportar CSV
            </Button>
          </DialogActions>
        </Dialog>

        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            icon={<CalendarToday />}
            label={`Últimos ${timeRange} dias`}
            variant="outlined"
          />
          <TextField
            select
            size="small"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="7">7 dias</MenuItem>
            <MenuItem value="30">30 dias</MenuItem>
            <MenuItem value="90">90 dias</MenuItem>
            <MenuItem value="365">1 ano</MenuItem>
          </TextField>
          <Tooltip title="Atualizar Dados">
            <IconButton onClick={() => setRefreshKey(prev => prev + 1)} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar Dados">
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => setExportDialog(true)}
            >
              Exportar
            </Button>
          </Tooltip>
        </Stack>
      </Box>



      {/* Alertas Críticos */}
      {alerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="warning" sx={{ mb: 1 }}>
            <strong>{alerts.length} alerta(s) de estoque</strong>
          </Alert>
          <Grid container spacing={1}>
            {alerts.map((alert, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Alert severity={alert.severity} variant="outlined">
                  {alert.message}
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }} justifyContent={'center'}>
        <Grid item xs={12} sm={6} md={3} >
          <Card sx={{
            background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Inventory sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {statistics.totalStock}
              </Typography>
              <Typography variant="body2">Total em Estoque</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {statistics.totalConsumption}
              </Typography>
              <Typography variant="body2">Consumo no Período</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #ffa000 0%, #ffb300 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {statistics.avgDailyConsumption}
              </Typography>
              <Typography variant="body2">Média Diária</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
            color: 'white',
            height: '100%'
          }}>
            <CardContent>
              <Warning sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" fontWeight="bold">
                {statistics.criticalItems}
              </Typography>
              <Typography variant="body2">Itens Críticos</Typography>
            </CardContent>
          </Card>
        </Grid>


        {/* NOVO: Status do Sistema */}
        <Grid container spacing={2} sx={{ mb: 3,maxWidth:isMobile ? '100%' : '50%'}} >
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Sensors sx={{ mr: 1 }} />
                Status do Sistema IoT
              </Typography>
              <Grid container spacing={2}>
                {equipmentHealth.map((equipment, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="medium">
                        {equipment.name}
                      </Typography>
                      <Chip
                        label={`${equipment.uptime}%`}
                        size="small"
                        color={equipment.status === 'optimal' ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={equipment.uptime}
                      color={equipment.status === 'optimal' ? 'success' : 'warning'}
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Grid>

      {/* Gráficos Principais (MANTIDOS ORIGINAIS) */}
      <Grid container spacing={2} justifyContent={'center'}>
        {/* Consumo por Item */}
        <Grid item xs={12} md={8} sx={{ minWidth:isMobile ? '100%' : '25%'}}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterList sx={{ mr: 1 }} />
              Consumo por Item (Últimos {timeRange} dias)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consumptionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="consumo" name="Consumo" fill="#1565c0">
                  {consumptionData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="estoque" name="Estoque Atual" fill="#42a5f5">
                  {consumptionData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[(index + 5) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>


        {/* Tendência Temporal */}
        <Grid item xs={12} sx={{ width:isMobile ? '100%' : '30%'}}  justifyContent={'center'}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }} >
            <Typography variant="h6" gutterBottom>
              Tendência de Consumo Diário
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="consumo"
                  stroke="#1565c0"
                  fill="rgba(21, 101, 192, 0.2)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="consumo"
                  stroke="#1565c0"
                  strokeWidth={2}
                  dot={{ fill: '#1565c0', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Distribuição do Estoque */}
        <Grid item xs={12} md={4} sx={{ width:isMobile ? '100%' : '33%'}}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribuição do Estoque
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {stockData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>


       <Grid item xs={12} md={6} lg={8} sx={{ width:isMobile ? '100%' : '40%'}}>
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" gutterBottom>
        Detecções Recentes
      </Typography>
      <List>
        {recentDetections.length > 0 ? (
          recentDetections.map((detection, index) => (
            <ListItem key={index} divider>
              <ListItemIcon>
                <Chip 
                  label={`${(detection.score * 100).toFixed(1)}%`} 
                  size="small" 
                  color="primary"
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography fontWeight="bold" textTransform="capitalize">
                    {detection.label}
                  </Typography>
                }
                secondary={detection.date}
              />
            </ListItem>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Nenhuma detecção recente
          </Typography>
        )}
      </List>
    </Paper>
  </Grid>

  {/* Estatísticas Detalhadas */}
  <Grid item xs={12} md={6} lg={4}  >
    <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
      <Typography variant="h6" gutterBottom>
        Estatísticas Detalhadas
      </Typography>
      <Stack spacing={2}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Itens únicos consumidos
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {statistics.uniqueItems} itens
          </Typography>
        </Box>
        
        <Divider />
        
        <Box>
          <Typography variant="body2" color="text.secondary">
            Precisão da IA
          </Typography>
          <Typography variant="h6" fontWeight="bold" color="primary">
            {statistics.aiAccuracy}
          </Typography>
        </Box>
        
        <Divider />
        
        <Box>
          <Typography variant="body2" color="text.secondary">
            Item mais consumido
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {statistics.mostConsumed}
          </Typography>
        </Box>
        
        <Divider />
        
        <Box>
          <Typography variant="body2" color="text.secondary">
            Detecções no período
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            {statistics.periodDetections} registros
          </Typography>
        </Box>
      </Stack>
    </Paper>
  </Grid>

  {/* Cards de Monitoramento IoT - responsivo */}
  <Grid item xs={12} sx={{ width:isTablet ? '100%' : '30%'}}>
    <Grid container spacing={3} >
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ textAlign: 'center', p: 2 }}>
          <PrecisionManufacturing color="primary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="primary">
            {statistics.aiAccuracy}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Precisão da IA
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ textAlign: 'center', p: 2 }}>
          <Speed color="secondary" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="secondary">
            {realTimeData.processingSpeed?.toFixed(0) || 0}ms
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Velocidade
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ textAlign: 'center', p: 2 }}>
          <Sensors color="success" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="success.main">
            {realTimeData.temperature?.toFixed(1) || 0}°C
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Temperatura
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ textAlign: 'center', p: 2 }}>
          <Sensors color="info" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="info.main">
            {realTimeData.humidity?.toFixed(1) || 0}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Umidade
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={2.4}>
        <Card sx={{ textAlign: 'center', p: 2 }}>
          <Speed color="warning" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold" color="warning.main">
            {realTimeData.networkLatency?.toFixed(0) || 0}ms
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Latência
          </Typography>
        </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      {/* Botão Flutuante para Exportação Rápida */}
      <Tooltip title="Exportar Dados">
        <Fab
          color="primary"
          aria-label="exportar"
          onClick={() => setExportDialog(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
          }}
        >
          <Download />
        </Fab>
      </Tooltip>

      <ExportDialog />
    </Box>
  );
}