import { useCallback, useEffect, useState } from 'react'
import { LoginPage, RegisterPage } from '@/components/auth/AuthPages'
import { LangPage } from '@/components/my/sub/LangPage'
import { BonusMessageDetailPage } from '@/components/bonus/BonusMessageDetailPage'
import { BonusMessagesPage } from '@/components/bonus/BonusMessagesPage'
import { BonusPage } from '@/components/bonus/BonusPage'
import { CaiJinPage } from '@/components/bonus/CaiJinPage'
import { GamePage } from '@/components/game/GamePage'
import { HomePage } from '@/components/home/HomePage'
import { AppShell } from '@/components/layout/BottomTabBar'
import { LotteryGamePage } from '@/components/lottery/LotteryGamePage'
import { LotteryHistoryPage } from '@/components/lottery/LotteryHistoryPage'
import { LotteryLobbyPage } from '@/components/lottery/LotteryLobbyPage'
import { LotteryRulePage } from '@/components/lottery/LotteryRulePage'
import { MyPage } from '@/components/my/MyPage'
import { SubPageRouter } from '@/components/my/sub/SubPageRouter'
import { ServicePage } from '@/components/service/ServicePage'
import { useAuth } from '@/context/AuthContext'
import {
  memberHashFromView,
  memberNavigate,
  parseMemberHash,
  tabFromView,
} from '@/lib/memberRouting'
import type { AppView, GameItem, LotteryItem, SubPage, TabId } from '@/types'

const PROTECTED_TABS: TabId[] = ['game', 'bonus', 'service', 'my']

function AppRoutes() {
  const { isLoggedIn } = useAuth()
  const [view, setView] = useState<AppView>(() => parseMemberHash() ?? 'home')
  const [returnView, setReturnView] = useState<AppView>('my')
  const [langReturnView, setLangReturnView] = useState<AppView>('login')
  const [subStack, setSubStack] = useState<SubPage[]>([])

  const navigate = useCallback((next: AppView) => {
    setView(next)
    const nextHash = memberHashFromView(next)
    if (window.location.hash !== nextHash) {
      memberNavigate(next)
    }
  }, [])

  useEffect(() => {
    const syncFromHash = () => {
      const parsed = parseMemberHash()
      if (parsed) setView(parsed)
    }
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  const goLogin = useCallback(
    (returnTo: AppView = 'home') => {
      setReturnView(returnTo)
      navigate('login')
    },
    [navigate],
  )

  const openSubPage = useCallback(
    (page: SubPage, params?: Record<string, string>) => {
      setView((current) => {
        if (typeof current === 'object' && current.type === 'sub') {
          setSubStack((stack) => [...stack, current.page])
        } else {
          setReturnView(typeof current === 'string' ? current : 'my')
          setSubStack([])
        }
        const next = { type: 'sub' as const, page, params }
        const nextHash = memberHashFromView(next)
        if (window.location.hash !== nextHash) memberNavigate(next)
        return next
      })
    },
    [],
  )

  const goBackFromSub = useCallback(() => {
    if (subStack.length > 0) {
      const prev = subStack[subStack.length - 1]
      setSubStack((stack) => stack.slice(0, -1))
      navigate({ type: 'sub', page: prev })
    } else {
      navigate(typeof returnView === 'string' ? returnView : 'my')
    }
  }, [subStack, returnView, navigate])

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (PROTECTED_TABS.includes(tab) && !isLoggedIn) {
        goLogin(tab)
        return
      }
      navigate(tab)
    },
    [isLoggedIn, goLogin, navigate],
  )

  const openLottery = useCallback(
    (item: LotteryItem, from: TabId = 'home') => {
      navigate({ type: 'lottery', code: item.code, id: item.id, from })
    },
    [navigate],
  )

  const openGame = useCallback(
    (game: GameItem) => {
      openLottery({ id: game.id, code: game.code, name: game.name, image: game.image }, 'game')
    },
    [openLottery],
  )

  const lotteryBack = useCallback(
    (from?: TabId) => {
      navigate(from === 'home' ? 'home' : 'game')
    },
    [navigate],
  )

  const drawerNav = useCallback(
    (page: SubPage, params?: Record<string, string>) => {
      if (!isLoggedIn) {
        goLogin(typeof view === 'object' ? view : 'game')
        return
      }
      openSubPage(page, params)
    },
    [isLoggedIn, goLogin, openSubPage, view],
  )

  if (view === 'login') {
    return (
      <LoginPage
        onBack={() => navigate(typeof returnView === 'string' ? returnView : 'home')}
        onRegisterClick={() => navigate('register')}
        onSuccess={() => navigate(typeof returnView === 'string' ? returnView : 'home')}
        onLanguageClick={() => {
          setLangReturnView('login')
          navigate('lang')
        }}
      />
    )
  }

  if (view === 'register') {
    return (
      <RegisterPage
        onBack={() => navigate('login')}
        onLoginClick={() => navigate('login')}
        onSuccess={() => navigate(typeof returnView === 'string' ? returnView : 'home')}
        onLanguageClick={() => {
          setLangReturnView('register')
          navigate('lang')
        }}
      />
    )
  }

  if (view === 'lang') {
    return <LangPage onBack={() => navigate(langReturnView)} />
  }

  const bonusNav = {
    toCaijin: () => navigate('bonus'),
    toPromotions: () => navigate({ type: 'bonus-promotions' }),
    toMessages: () => navigate({ type: 'bonus-messages' }),
  }

  if (typeof view === 'object' && view.type === 'bonus-promotions') {
    return (
      <BonusPage
        onBack={bonusNav.toCaijin}
        onCaijinClick={bonusNav.toCaijin}
        onMessagesClick={bonusNav.toMessages}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'bonus-messages') {
    return (
      <BonusMessagesPage
        onBack={bonusNav.toCaijin}
        onMessageClick={(id) => navigate({ type: 'bonus-message', id })}
        onPromotionsClick={bonusNav.toPromotions}
        onCaijinClick={bonusNav.toCaijin}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'bonus-message') {
    return (
      <BonusMessageDetailPage
        id={view.id}
        onBack={() => navigate({ type: 'bonus-messages' })}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'lottery-lobby') {
    return (
      <LotteryLobbyPage
        filter={view.filter}
        onBack={() => navigate(view.from ?? 'home')}
        onLotteryClick={openLottery}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'lottery-rule') {
    return (
      <LotteryRulePage
        code={view.code}
        onBack={() => {
          if (view.lotteryReturn) {
            navigate({
              type: 'lottery',
              code: view.code,
              id: view.gameId,
              from: view.from,
            })
          } else {
            lotteryBack(view.from ?? 'game')
          }
        }}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'lottery-history') {
    return (
      <LotteryHistoryPage
        gameId={view.gameId}
        code={view.code}
        onBack={() => {
          navigate({
            type: 'lottery',
            code: view.code,
            id: view.gameId,
            from: view.from,
          })
        }}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'lottery') {
    return (
      <LotteryGamePage
        code={view.code}
        onBack={() => lotteryBack(view.from)}
        onLoginClick={() => goLogin(view)}
        onHistoryClick={(gameId, code) =>
          navigate({ type: 'lottery-history', gameId, code, from: view.from })
        }
        onRuleClick={(gameId, code) =>
          navigate({
            type: 'lottery-rule',
            gameId,
            code,
            from: view.from,
            lotteryReturn: true,
          })
        }
        onSwitchGame={(item) =>
          navigate({ type: 'lottery', code: item.code, id: item.id, from: view.from })
        }
        onNavigateSub={drawerNav}
        onServiceClick={() => navigate('service')}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'sub') {
    return (
      <SubPageRouter
        page={view.page}
        params={view.params}
        onBack={goBackFromSub}
        onNavigate={openSubPage}
      />
    )
  }

  const activeTab = tabFromView(view)
  const showTabBar = typeof view === 'string'

  const page = (() => {
    switch (view) {
      case 'home':
        return (
          <HomePage
            onLoginClick={() => goLogin('home')}
            onLotteryClick={openLottery}
            onLobbyClick={() => navigate({ type: 'lottery-lobby', from: 'home' })}
            onHotClick={() =>
              navigate({ type: 'lottery-lobby', filter: 'hot', from: 'home' })
            }
            onAllClick={() =>
              navigate({ type: 'lottery-lobby', filter: 'all', from: 'home' })
            }
          />
        )
      case 'game':
        return (
          <GamePage
            onBackHome={() => navigate('home')}
            onGameClick={openGame}
            onRulesClick={(game) =>
              navigate({
                type: 'lottery-rule',
                gameId: game.id,
                code: game.code,
                from: 'game',
              })
            }
            onNavigateSub={drawerNav}
            onServiceClick={() => navigate('service')}
          />
        )
      case 'bonus':
        return (
          <CaiJinPage
            onPromotionsClick={bonusNav.toPromotions}
            onMessagesClick={bonusNav.toMessages}
          />
        )
      case 'service':
        return <ServicePage />
      case 'my':
        return (
          <MyPage
            onLoginClick={() => goLogin('my')}
            onNavigate={openSubPage}
            onServiceClick={() => navigate('service')}
          />
        )
      default:
        return null
    }
  })()

  return (
    <AppShell activeTab={activeTab} onTabChange={handleTabChange} showTabBar={showTabBar}>
      {page}
    </AppShell>
  )
}

function App() {
  return <AppRoutes />
}

export default App
