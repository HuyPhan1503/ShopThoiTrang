import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ChatboxWidget from '../components/ChatboxWidget';

const MainLayout = () => {
    return (
        <>
            <Header />
            <main className="main-content">
                <div className="container">
                    <Outlet />
                </div>
            </main>
            <Footer />
            <ChatboxWidget />
        </>
    );
};

export default MainLayout;