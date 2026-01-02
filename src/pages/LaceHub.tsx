import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, BookOpen, Video, MessageSquare, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  content_type: string;
  created_at: string;
  logo_url?: string | null;
  is_featured?: boolean;
  click_count?: number;
}

const LaceHub = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();

  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      // Fetch click counts for each resource
      const { data: clicksData } = await supabase
        .from("resource_clicks")
        .select("resource_id");

      const clickCounts = clicksData?.reduce((acc, click) => {
        acc[click.resource_id] = (acc[click.resource_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Add click counts and sort by is_featured, clicks, then created_at
      const resourcesWithClicks = (data || [])
        .map(resource => ({
          ...resource,
          click_count: clickCounts[resource.id] || 0,
        }))
        .sort((a, b) => {
          // First sort by is_featured (true comes first)
          if (a.is_featured !== b.is_featured) {
            return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
          }
          // Then sort by click count (highest first)
          if (a.click_count !== b.click_count) {
            return b.click_count - a.click_count;
          }
          // Finally sort by created_at (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      setResources(resourcesWithClicks);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast({
        title: "Error",
        description: "Failed to load resources",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const isFileResource = (url: string) => {
    return url.includes('/storage/v1/object/public/resource-files/');
  };

  const getFileExtension = (url: string) => {
    const filename = url.split('/').pop() || '';
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || null;
  };

  const trackClick = async (resourceId: string, url: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("resource_clicks").insert({
          resource_id: resourceId,
          user_id: user.id,
        });
      }

      if (isFileResource(url)) {
        // Download the file
        const link = document.createElement('a');
        link.href = url;
        link.download = url.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Error tracking click:", error);
      if (isFileResource(url)) {
        const link = document.createElement('a');
        link.href = url;
        link.download = url.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.open(url, "_blank");
      }
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case "article":
        return <BookOpen className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "mentor_advice":
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.split("_").map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const filteredResources = selectedCategory === "all"
    ? resources
    : resources.filter(r => r.category === selectedCategory);

  const categories = ["all", ...Array.from(new Set(resources.map(r => r.category)))];

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <LoadingSpinner fullPage text="Loading resources..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex justify-center items-center gap-4 sm:gap-6 mb-8 sm:mb-10">
        <img
          src="/LaceHub.PNG"
          alt="LaceHub"
          className="h-24 w-24 sm:h-36 sm:w-36 rounded-xl object-contain shadow-md flex-shrink-0"
        />
        <div className="flex flex-col justify-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">LaceHub</h1>
          <p className="text-muted-foreground text-sm sm:text-lg mt-1">
            Your centralized resource hub for life beyond sports
          </p>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category === "all" ? "All Resources" : getCategoryLabel(category)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No resources available yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <Card key={resource.id} className="h-auto overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] flex flex-col">
              {resource.logo_url && (
                <button
                  onClick={() => trackClick(resource.id, resource.url)}
                  className="w-full h-32 bg-muted flex items-center justify-center p-4 cursor-pointer hover:bg-muted/80 transition-all duration-200"
                >
                  <img
                    src={resource.logo_url}
                    alt={`${resource.title} logo`}
                    className="max-h-full max-w-full object-contain transition-transform duration-200 hover:scale-105"
                  />
                </button>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getContentIcon(resource.content_type)}
                    <Badge variant="secondary" className="capitalize text-xs">
                      {resource.content_type.replace("_", " ")}
                    </Badge>
                    {isFileResource(resource.url) && getFileExtension(resource.url) && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {getFileExtension(resource.url)}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="capitalize text-xs">
                    {getCategoryLabel(resource.category)}
                  </Badge>
                </div>
                <CardTitle className="line-clamp-2 text-lg">{resource.title}</CardTitle>
                <CardDescription className="text-sm mt-1">
                  {resource.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-3 mt-auto">
                <Button
                  onClick={() => trackClick(resource.id, resource.url)}
                  className="w-full h-9 text-sm"
                  variant="default"
                >
                  {isFileResource(resource.url) ? (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LaceHub;
