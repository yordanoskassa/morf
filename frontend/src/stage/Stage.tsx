import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const traffic = [
  { name: 'Mon', visits: 4200, unique: 3100 },
  { name: 'Tue', visits: 5100, unique: 3800 },
  { name: 'Wed', visits: 4800, unique: 3600 },
  { name: 'Thu', visits: 6200, unique: 4700 },
  { name: 'Fri', visits: 7100, unique: 5400 },
  { name: 'Sat', visits: 5600, unique: 4300 },
  { name: 'Sun', visits: 4900, unique: 3700 },
]

const revenue = [
  { name: 'Mon', value: 1200 },
  { name: 'Tue', value: 1900 },
  { name: 'Wed', value: 1600 },
  { name: 'Thu', value: 2400 },
  { name: 'Fri', value: 2800 },
  { name: 'Sat', value: 2100 },
  { name: 'Sun', value: 1700 },
]

const distribution = [
  { name: 'Direct', value: 35, color: '#8b5cf6' },
  { name: 'Social', value: 25, color: '#06b6d4' },
  { name: 'Organic', value: 30, color: '#10b981' },
  { name: 'Referral', value: 10, color: '#f59e0b' },
]

const recent = [
  { user: 'Elena R.', action: 'deployed', target: 'v2.4.0', time: '2m ago', status: 'success' },
  { user: 'Marcus T.', action: 'merged', target: 'feature/auth', time: '14m ago', status: 'success' },
  { user: 'Sofia L.', action: 'opened', target: 'issue #842', time: '32m ago', status: 'warning' },
  { user: 'Dylan K.', action: 'failed', target: 'ci/build', time: '1h ago', status: 'error' },
  { user: 'Ava M.', action: 'shipped', target: 'dashboard', time: '2h ago', status: 'success' },
]

const kpi = [
  { label: 'Total users', value: '84.2K', change: '+12.5%', good: true },
  { label: 'Revenue', value: '$42.8K', change: '+8.2%', good: true },
  { label: 'Churn', value: '2.4%', change: '-0.6%', good: true },
  { label: 'Uptime', value: '99.99%', change: '+0.01%', good: true },
]

export default function Stage() {
  const [range, setRange] = useState('7d')

  return (
    <div className="flex h-full flex-col overflow-auto bg-background p-6 text-foreground">
      {/* header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground">Real-time product health, traffic, and revenue.</p>
        </div>
        <div className="flex items-center gap-2">
          {['24h', '7d', '30d'].map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'default' : 'outline'}
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
          <Button size="sm">Export</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((k) => (
          <Card key={k.label} className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="text-2xl">{k.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={k.good ? 'bg-emerald-600' : 'bg-amber-500'}>{k.change}</Badge>
              <span className="ml-2 text-xs text-muted-foreground">vs last {range}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* charts */}
      <Tabs defaultValue="traffic" className="mb-6 flex-1">
        <TabsList className="mb-4">
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="mt-0">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base">Visits vs. unique visitors</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="visits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="unique" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="oklch(0.708 0 0)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.708 0 0)" />
                  <Tooltip
                    contentStyle={{
                      background: 'oklch(0.205 0 0)',
                      border: '1px solid oklch(1 0 0 / 10%)',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Area type="monotone" dataKey="visits" stroke="#8b5cf6" strokeWidth={2} fill="url(#visits)" />
                  <Area type="monotone" dataKey="unique" stroke="#06b6d4" strokeWidth={2} fill="url(#unique)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-0">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base">Daily revenue</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="oklch(0.708 0 0)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="oklch(0.708 0 0)" />
                  <Tooltip
                    contentStyle={{
                      background: 'oklch(0.205 0 0)',
                      border: '1px solid oklch(1 0 0 / 10%)',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-0">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base">Traffic sources</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                  >
                    {distribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'oklch(0.205 0 0)',
                      border: '1px solid oklch(1 0 0 / 10%)',
                      borderRadius: '0.5rem',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold">
                      {item.user.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{item.user}</span>
                      <span className="text-muted-foreground"> {item.action} </span>
                      <span className="font-medium">{item.target}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge
                      variant={
                        item.status === 'success' ? 'default' : item.status === 'warning' ? 'secondary' : 'destructive'
                      }
                      className={item.status === 'success' ? 'bg-emerald-600' : undefined}
                    >
                      {item.status}
                    </Badge>
                    <span className="hidden sm:inline">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-base">System status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: 'API', status: 'Operational', load: 42 },
              { name: 'Database', status: 'Operational', load: 28 },
              { name: 'CDN', status: 'Degraded', load: 78 },
              { name: 'Workers', status: 'Operational', load: 35 },
            ].map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className={s.status === 'Operational' ? 'text-emerald-400' : 'text-amber-400'}>{s.status}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s.status === 'Operational' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${s.load}%` }}
                  />
                </div>
              </div>
            ))}
            <Separator />
            <Button variant="outline" className="w-full">
              View incident history
            </Button>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-6 text-center text-xs text-muted-foreground">
        © 2026 Morph Dashboard · built by racing models
      </footer>
    </div>
  )
}
