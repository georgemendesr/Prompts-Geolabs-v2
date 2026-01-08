import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { Layout } from '@/components/Layout';
import { PromptGrid } from '@/components/PromptGrid';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { importPromptsFromCSV } from '@/lib/importPrompts';
import { toast } from 'sonner';

const Index = () => {
  const { user, loading } = useAuth();
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    async function autoImport() {
      if (user && !importing && !imported) {
        setImporting(true);
        const result = await importPromptsFromCSV(user.id);
        if (result.inserted > 0) {
          toast.success(`${result.inserted} prompts importados automaticamente!`);
        }
        setImported(true);
        setImporting(false);
      }
    }
    autoImport();
  }, [user, importing, imported]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (importing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Importando seus prompts...</p>
      </div>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Biblioteca de Prompts</h1>
          <p className="text-muted-foreground">
            Prompts ordenados por mérito (rating + uso) • Top 5 destacados
          </p>
        </div>
        <PromptGrid />
      </div>
    </Layout>
  );
};

export default Index;
