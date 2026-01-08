import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePrompts, useCategories } from '@/hooks/usePrompts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#8b5cf6', '#3b82f6', '#ef4444', '#22c55e'];

const Dashboard = () => {
  const { data: prompts = [] } = usePrompts();
  const { data: categories = [] } = useCategories();

  // Top 10 most used prompts
  const topUsed = [...prompts]
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 10)
    .map((p) => ({
      name: p.title.slice(0, 25) + (p.title.length > 25 ? '...' : ''),
      usos: p.usage_count,
    }));

  // Distribution by category
  const categoryDistribution = categories.map((cat) => {
    const count = prompts.filter((p) => p.category_id === cat.id).length;
    return {
      name: cat.name,
      value: count,
    };
  });

  // Stats
  const totalPrompts = prompts.length;
  const totalUsage = prompts.reduce((sum, p) => sum + p.usage_count, 0);
  const avgRating = prompts.length > 0
    ? (prompts.reduce((sum, p) => sum + p.rating, 0) / prompts.length).toFixed(1)
    : '0';
  const top5Avg = prompts.length >= 5
    ? (prompts.slice(0, 5).reduce((sum, p) => sum + p.rating, 0) / 5).toFixed(1)
    : avgRating;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Estatísticas e performance dos seus prompts
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Prompts</CardDescription>
              <CardTitle className="text-3xl">{totalPrompts}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Usos Totais</CardDescription>
              <CardTitle className="text-3xl">{totalUsage}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rating Médio</CardDescription>
              <CardTitle className="text-3xl">⭐ {avgRating}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rating Top 5</CardDescription>
              <CardTitle className="text-3xl">🏆 {top5Avg}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Used Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Prompts Mais Usados</CardTitle>
              <CardDescription>Top 10 por número de usos</CardDescription>
            </CardHeader>
            <CardContent>
              {topUsed.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topUsed} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="usos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  Nenhum dado de uso disponível
                </p>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
              <CardDescription>Quantidade de prompts por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryDistribution.some((c) => c.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  Nenhum prompt importado ainda
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
