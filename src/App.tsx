import { useCallback, useState } from 'react'
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
import type { AppView, GameItem, LotteryItem, SubPage, TabId } from '@/types'

const PROTECTED_TABS: TabId[] = ['game', 'bonus', 'service', 'my']

function AppRoutes() {
  const { isLoggedIn } = useAuth()
  const [view, setView] = useState<AppView>('home')
  const [returnView, setReturnView] = useState<AppView>('my')
  const [langReturnView, setLangReturnView] = useState<AppView>('login')
  const [subStack, setSubStack] = useState<SubPage[]>([])

  const goLogin = useCallback((returnTo: AppView = 'home') => {
    setReturnView(returnTo)
    setView('login')
  }, [])

  const openSubPage = useCallback(
    (page: SubPage, params?: Record<string, string>) => {
      setView((current) => {
        if (typeof current === 'object' && current.type === 'sub') {
          setSubStack((stack) => [...stack, current.page])
        } else {
          setReturnView(typeof current === 'string' ? current : 'my')
          setSubStack([])
        }
        return { type: 'sub', page, params }
      })
    },
    [],
  )

  const goBackFromSub = useCallback(() => {
    if (subStack.length > 0) {
      const prev = subStack[subStack.length - 1]
      setSubStack((stack) => stack.slice(0, -1))
      setView({ type: 'sub', page: prev })
    } else {
      setView(typeof returnView === 'string' ? returnView : 'my')
    }
  }, [subStack, returnView])

  const handleTabChange = useCallback(
    (tab: TabId) => {
      if (PROTECTED_TABS.includes(tab) && !isLoggedIn) {
        goLogin(tab)
        return
      }
      setView(tab)
    },
    [isLoggedIn, goLogin],
  )

  const openLottery = useCallback(
    (item: LotteryItem, from: TabId = 'home') => {
      const lotteryView = { type: 'lottery' as const, code: item.code, id: item.id, from }
      if (!isLoggedIn) {
        goLogin(lotteryView)
        return
      }
      setView(lotteryView)
    },
    [isLoggedIn, goLogin],
  )

  const openGame = useCallback(
    (game: GameItem) => {
      openLottery({ id: game.id, code: game.code, name: game.name, image: game.image }, 'game')
    },
    [openLottery],
  )

  const lotteryBack = useCallback((from?: TabId) => {
    setView(from ?? 'home')
  }, [])

  if (view === 'login') {
    return (
      <LoginPage
        onBack={() => setView(typeof returnView === 'string' ? returnView : 'home')}
        onRegisterClick={() => setView('register')}
        onSuccess={() => setView(typeof returnView === 'string' ? returnView : 'home')}
        onLanguageClick={() => {
          setLangReturnView('login')
          setView('lang')
        }}
      />
    )
  }

  if (view === 'register') {
    return (
      <RegisterPage
        onBack={() => setView('login')}
        onLoginClick={() => setView('login')}
        onSuccess={() => setView(typeof returnView === 'string' ? returnView : 'home')}
        onLanguageClick={() => {
          setLangReturnView('register')
          setView('lang')
        }}
      />
    )
  }

  if (view === 'lang') {
    return <LangPage onBack={() => setView(langReturnView)} />
  }

  const bonusNav = {
    toCaijin: () => setView('bonus'),
    toPromotions: () => setView({ type: 'bonus-promotions' }),
    toMessages: () => setView({ type: 'bonus-messages' }),
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
        onMessageClick={(id) => setView({ type: 'bonus-message', id })}
        onPromotionsClick={bonusNav.toPromotions}
        onCaijinClick={bonusNav.toCaijin}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'bonus-message') {
    return (
      <BonusMessageDetailPage
        id={view.id}
        onBack={() => setView({ type: 'bonus-messages' })}
      />
    )
  }

  if (typeof view === 'object' && view.type === 'lottery-lobby') {
    return (
      <LotteryLobbyPage
        filter={view.filter}
        onBack={() => setView('home')}
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
            setView({
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
          setView({
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
          setView({ type: 'lottery-history', gameId, code, from: view.from })
        }
        onRuleClick={(gameId, code) =>
          setView({
            type: 'lottery-rule',
            gameId,
            code,
            from: view.from,
            lotteryReturn: true,
          })
        }
        onSwitchGame={(item) =>
          setView({ type: 'lottery', code: item.code, id: item.id, from: view.from })
        }
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

  const activeTab: TabId = typeof view === 'string' ? view : 'my'
  const showTabBar = typeof view === 'string'

  const page = (() => {
    switch (view) {
      case 'home':
        return (
          <HomePage
            onLoginClick={() => goLogin('home')}
            onLotteryClick={openLottery}
            onLobbyClick={() => setView({ type: 'lottery-lobby' })}
            onHotClick={() => setView({ type: 'lottery-lobby', filter: 'hot' })}
            onAllClick={() => setView({ type: 'lottery-lobby', filter: 'all' })}
          />
        )
      case 'game':
        return (
          <GamePage
            onGameClick={openGame}
            onRulesClick={(game) =>
              setView({
                type: 'lottery-rule',
                gameId: game.id,
                code: game.code,
                from: 'game',
              })
            }
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
            onServiceClick={() => setView('service')}
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
