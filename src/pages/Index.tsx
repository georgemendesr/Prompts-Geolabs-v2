import { useAuth } from '@/hooks/useAuth';
import { AuthForm } from '@/components/AuthForm';
import { Layout } from '@/components/Layout';
import { PromptGrid } from '@/components/PromptGrid';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

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
