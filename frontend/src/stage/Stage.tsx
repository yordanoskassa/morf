import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  LineChart,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'

const traffic = [
  { name: 'Mon', visits: 4200, unique: 3100, bounce: 42 },
  { name: 'Tue', visits: 5100, unique: 3800, bounce: 40 },
  { name: 'Wed', visits: 4800, unique: 3600, bounce: 41 },
  { name: 'Thu', visits: 6200, unique: 4700, bounce: 38 },
  { name: 'Fri', visits: 7100, unique: 5400, bounce: 36 },
  { name: 'Sat', visits: 5600, unique: 4300, bounce: 39 },
  { name: 'Sun', visits: 4900, unique: 3700, bounce: 43 },
]

const revenue = [
  { name: 'Mon', value: 1200, mrr: 9800 },
  { name: 'Tue', value: 1900, mrr: 9850 },
  { name: 'Wed', value: 1600, mrr: 9900 },
  { name: 'Thu', value: 2400, mrr: 10200 },
  { name: 'Fri', value: 2800, mrr: 10500 },
  { name: 'Sat', value: 2100, mrr: 10600 },
  { name: 'Sun', value: 1700, mrr: 10800 },
]

const distribution = [
  { name: 'Direct', value: 35, color: '#808000' },
  { name: 'Social', value: 25, color: '#9aa83a' },
  { name: 'Organic', value: 30, color: '#5c6b12' },
  { name: 'Referral', value: 10, color: '#b5c24a' },
]

const funnel = [
  { name: 'Visitors', value: 12400, fill: '#808000' },
  { name: 'Signups', value: 6200, fill: '#9aa83a' },
  { name: 'Activated', value: 3100, fill: '#5c6b12' },
  { name: 'Paid', value: 1240, fill: '#4a5a0a' },
]

const recent = [
  { user: 'Elena R.', action: 'deployed', target: 'v2.4.0', time: '2m ago', status: 'success' },
  { user: 'Marcus T.', action: 'merged', target: 'feature/auth', time: '14m ago', status: 'success' },
  { user: 'Sofia L.', action: 'opened', target: 'issue #842', time: '32m ago', status: 'warning' },
  { user: 'Dylan K.', action: 'failed', target: 'ci/build', time: '1h ago', status: 'error' },
  { user: 'Ava M.', action: 'shipped', target: 'dashboard', time: '2h ago', status: 'success' },
  { user: 'Noah P.', action: 'reviewed', target: 'PR #412', time: '3h ago', status: 'success' },
]

const transactions = [
  { id: '#TRX-9841', customer: 'Acme Corp', plan: 'Enterprise', amount: '$2,400', status: 'completed', date: 'Today, 10:23 AM' },
  { id: '#TRX-9840', customer: 'Lambda Labs', plan: 'Pro', amount: '$590', status: 'completed', date: 'Today, 09:45 AM' },
  { id: '#TRX-9839', customer: 'Orbit Inc', plan: 'Starter', amount: '$49', status: 'pending', date: 'Today, 08:12 AM' },
  { id: '#TRX-9838', customer: 'Vertex AI', plan: 'Pro', amount: '$590', status: 'failed', date: 'Yesterday, 11:30 PM' },
  { id: '#TRX-9837', customer: 'Nebula Co', plan: 'Enterprise', amount: '$2,400', status: 'completed', date: 'Yesterday, 06:15 PM' },
]

const team = [
  { name: 'Elena R.', role: 'Engineering', tasks: 12, load: 78 },
  { name: 'Marcus T.', role: 'Design', tasks: 8, load: 56 },
  { name: 'Sofia L.', role: 'Product', tasks: 15, load: 92 },
  { name: 'Dylan K.', role: 'DevOps', tasks: 6, load: 44 },
  { name: 'Ava M.', role: 'Data', tasks: 10, load: 65 },
]

const regions = [
  { region: 'North America', users: '34.2K', growth: '+14%', share: 42 },
  { region: 'Europe', users: '22.8K', growth: '+9%', share: 28 },
  { region: 'Asia Pacific', users: '18.5K', growth: '+22%', share: 23 },
  { region: 'Latin America', users: '5.7K', growth: '+11%', share: 7 },
]

const kpi = [
  { label: 'Total users', value: '1000M', change: '+12.5%', good: true, sparkline: [42, 45, 44, 48, 52, 58, 62] },
  { label: 'Revenue', value: '$42.8K', change: '+8.2%', good: true, sparkline: [38, 40, 39, 42, 45, 48, 50] },
  { label: 'Churn', value: '2.4%', change: '-0.6%', good: true, sparkline: [3.2, 3.0, 2.9, 2.7, 2.6, 2.5, 2.4] },
  { label: 'Uptime', value: '99.99%', change: '+0.01%', good: true, sparkline: [99.95, 99.96, 99.97, 99.98, 99.98, 99.99, 99.99] },
]

const notifications = [
  { title: 'Deployment succeeded', detail: 'v2.4.0 is live in production.', time: '2m ago', type: 'success' },
  { title: 'High error rate', detail: 'API 500s spiked to 4.2% in us-east.', time: '12m ago', type: 'warning' },
  { title: 'New enterprise signup', detail: 'Acme Corp started a trial.', time: '1h ago', type: 'info' },
]

const goals = [
  { label: 'Q1 revenue target', current: 78, target: '$1.2M' },
  { label: 'New user signups', current: 64, target: '100K' },
  { label: 'Infrastructure cost', current: 42, target: '<$18K' },
]

const systems = [
  { name: 'API', status: 'Operational', load: 42 },
  { name: 'Database', status: 'Operational', load: 28 },
  { name: 'CDN', status: 'Degraded', load: 78 },
  { name: 'Workers', status: 'Operational', load: 35 },
  { name: 'Search', status: 'Operational', load: 51 },
  { name: 'Payments', status: 'Operational', load: 19 },
]

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge className="bg-emerald-600">completed</Badge>
  if (status === 'pending') return <Badge variant="secondary">pending</Badge>
  if (status === 'failed') return <Badge variant="destructive">failed</Badge>
  if (status === 'success') return <Badge className="bg-lime-700">success</Badge>
  if (status === 'warning') return <Badge variant="secondary">warning</Badge>
  if (status === 'error') return <Badge variant="destructive">error</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export default function Stage() {
  const [range, setRange] = useState('7d')
  const [activeTab, setActiveTab] = useState('traffic')
  const [search, setSearch] = useState('')

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions
    const q = search.toLowerCase()
    return transactions.filter((t) =>
      t.id.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || t.plan.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <div className="flex h-full flex-col overflow-auto bg-background p-6 text-foreground">
      {/* top nav */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hello Morph</h1>
          <p className="text-sm text-muted-foreground">Real-time product health, traffic, revenue, and operations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions…"
              className="h-8 w-48 rounded-lg border border-input bg-background/50 px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring sm:w-64"
            />
          </div>
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
          <Button size="sm" variant="outline">⚙ Settings</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((k) => (
          <Card key={k.label} className="border-white/10 bg-white/5">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardDescription>{k.label}</CardDescription>
                  <CardTitle className="text-2xl">{k.value}</CardTitle>
                </div>
                <Sparkline data={k.sparkline} color="#808000" />
              </div>
            </CardHeader>
            <CardContent>
              <StatusBadge status={k.good ? 'success' : 'warning'} />
              <span className="ml-2 text-xs text-muted-foreground">{k.change} vs last {range}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* main charts + side panels */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:col-span-2">
          <TabsList className="mb-4">
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
          </TabsList>

          <TabsContent value="traffic" className="mt-0">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base">Visits vs. unique visitors</CardTitle>
                <CardDescription>Bounce rate overlay shown in tooltip</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={traffic} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="visits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#808000" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#808000" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="unique" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9aa83a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#9aa83a" stopOpacity={0} />
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
                    <Area type="monotone" dataKey="visits" stroke="#808000" strokeWidth={2} fill="url(#visits)" />
                    <Area type="monotone" dataKey="unique" stroke="#9aa83a" strokeWidth={2} fill="url(#unique)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="mt-0">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base">Daily revenue & MRR</CardTitle>
                <CardDescription>MRR line tracks recurring subscription value</CardDescription>
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
                    <Bar dataKey="value" fill="#808000" radius={[6, 6, 0, 0]} />
                    <Line type="monotone" dataKey="mrr" stroke="#fbbf24" strokeWidth={2} dot={false} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-0">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base">Traffic sources</CardTitle>
                <CardDescription>Acquisition channel mix</CardDescription>
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
                      label
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

          <TabsContent value="funnel" className="mt-0">
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="text-base">Conversion funnel</CardTitle>
                <CardDescription>Visitor → signup → activation → paid</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip
                      contentStyle={{
                        background: 'oklch(0.205 0 0)',
                        border: '1px solid oklch(1 0 0 / 10%)',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Funnel dataKey="value" data={funnel} isAnimationActive>
                      <LabelList position="inside" fill="#fff" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* right column: notifications + goals */}
        <div className="flex flex-col gap-4">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((n, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-background/40 p-2.5">
                    <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.type === 'success' ? 'bg-emerald-400' : n.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{n.title}</span>
                        <span className="text-[10px] text-muted-foreground">{n.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{n.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-base">Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {goals.map((g) => (
                  <div key={g.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{g.label}</span>
                      <span className="text-muted-foreground">{g.target}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-lime-700" style={{ width: `${g.current}%` }} />
                    </div>
                    <div className="text-right text-[10px] text-muted-foreground">{g.current}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* transactions table */}
      <Card className="mb-6 border-white/10 bg-white/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent transactions</CardTitle>
              <CardDescription>Latest payments and subscription events</CardDescription>
            </div>
            <Button size="sm" variant="outline">View all</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-muted-foreground">
                <tr className="border-b border-white/10 [&>th]:px-4 [&>th]:py-2 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium">
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 [&>td]:px-4 [&>td]:py-2.5">
                    <td className="font-mono text-xs text-muted-foreground">{t.id}</td>
                    <td className="font-medium">{t.customer}</td>
                    <td>{t.plan}</td>
                    <td className="tabular-nums">{t.amount}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td className="text-xs text-muted-foreground">{t.date}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No transactions match “{search}”
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Regional performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regions.map((r) => (
                <div key={r.region} className="flex items-center justify-between rounded-lg bg-background/40 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{r.region}</div>
                    <div className="text-xs text-muted-foreground">{r.users} users · {r.growth}</div>
                  </div>
                  <div className="h-8 w-8 rounded-full border-4 border-lime-700/30 border-t-lime-700" style={{ transform: `rotate(${r.share * 3.6}deg)` }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Team workload</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-56">
              <div className="space-y-3 pr-3">
                {team.map((m) => (
                  <div key={m.name} className="space-y-1 rounded-lg bg-background/40 px-3 py-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.tasks} tasks</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{m.role}</div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${m.load > 80 ? 'bg-amber-500' : 'bg-lime-700'}`} style={{ width: `${m.load}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">System status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {systems.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className={s.status === 'Operational' ? 'text-lime-600' : 'text-amber-600'}>{s.status}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${s.status === 'Operational' ? 'bg-lime-700' : 'bg-amber-500'}`}
                    style={{ width: `${s.load}%` }}
                  />
                </div>
                <div className="text-right text-[10px] text-muted-foreground">{s.load}% load</div>
              </div>
            ))}
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="w-full">Incident history</Button>
              <Button variant="outline" size="sm" className="w-full">Runbook</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* recent activity */}
      <Card className="mb-6 mt-6 border-white/10 bg-white/5">
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
                  <StatusBadge status={item.status} />
                  <span className="hidden sm:inline">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <footer className="mt-2 text-center text-sm text-muted-foreground">
        © 2026 Morph Dashboard · built by racing models · {range} view
      </footer>
    </div>
  )
}
