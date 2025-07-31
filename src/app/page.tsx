import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loading } from '@/components/ui/loading'
import { Package, Terminal, Code2, Palette } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">
            calendar-aggregator{' '}
            <span className="text-muted-foreground">Development Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            Your Next.js app is running • Ready for development
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4" />
                UI Components
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Button className="w-full" size="sm">
                  Button
                </Button>
                <Input placeholder="Input field" />
                <Select>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="option1">Option 1</SelectItem>
                    <SelectItem value="option2">Option 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    Dialog Example
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Component Showcase</DialogTitle>
                    <DialogDescription>
                      All components are ready to use in your app.
                    </DialogDescription>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="w-4 h-4" />
                Development
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="font-mono text-xs space-y-1">
                <div className="text-green-600">npm run dev</div>
                <div className="text-blue-600">npm run build</div>
                <div className="text-purple-600">npm run test</div>
                <div className="text-orange-600">npm run lint</div>
                <div className="text-pink-600">npm run format</div>
              </div>
              <div className="pt-2">
                <Loading size="sm" className="mx-auto" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Code2 className="w-4 h-4" />
                Stack
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1">
                <div>Next.js 15 + Turbopack</div>
                <div>React 19 + TypeScript</div>
                <div>Tailwind CSS + shadcn/ui</div>
                <div>Vitest + React Testing</div>
                <div>ESLint + Prettier</div>
                <div>Husky + lint-staged</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-4 h-4" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                <div>📄 Edit this page:</div>
                <div className="font-mono text-muted-foreground">
                  src/app/page.tsx
                </div>
                <div className="pt-1">🤖 Ask Claude:</div>
                <div className="font-mono text-muted-foreground">
                  &quot;Add a contact form&quot;
                </div>
                <div className="font-mono text-muted-foreground">
                  &quot;Create a navbar&quot;
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Ready to build? Start by editing{' '}
            <code className="bg-muted px-1 py-0.5 rounded">
              src/app/page.tsx
            </code>
          </p>
        </div>
      </div>
    </main>
  )
}
