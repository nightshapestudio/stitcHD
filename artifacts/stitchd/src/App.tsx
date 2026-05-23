import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import StitchdEditor from "@/components/StitchdEditor";

function App() {
  return (
    <TooltipProvider>
      <StitchdEditor />
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
