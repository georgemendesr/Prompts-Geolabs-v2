import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, User, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { CategoryManager } from '@/components/categories/CategoryManager';
import { useExportPrompts } from '@/hooks/useExportPrompts';

const Settings = () => {
  const { user, signOut } = useAuth();
  const { isExporting, exportToCSV, exportToJSON } = useExportPrompts();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie sua conta, categorias e preferências
          </p>
        </div>

        {/* Category Manager */}
        <CategoryManager />

        {/* Export Prompts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Prompts
            </CardTitle>
            <CardDescription>Exporte todos os seus prompts em CSV ou JSON</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              disabled={isExporting}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={exportToJSON}
              disabled={isExporting}
            >
              <FileJson className="mr-2 h-4 w-4" />
              Exportar JSON
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Conta
            </CardTitle>
            <CardDescription>Informações da sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-foreground">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">ID</label>
              <p className="text-foreground font-mono text-xs">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Card>
          <CardHeader>
            <CardTitle>Sessão</CardTitle>
            <CardDescription>Gerenciar sua sessão</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;
