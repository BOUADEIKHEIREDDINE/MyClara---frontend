import React, { useEffect, useState } from 'react';
import { openDB, getAllFilesByEmail } from './indexeddb.js';

// Placeholder icons - in a real app, these would be imported SVG components
const AddIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-plus-square">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
);

const ModuleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-book">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
);

const AIChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#858596" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-message-square">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

const ExercisesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#858596" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-edit">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);

const LessonSchematiserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#858596" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-layout">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="3" y1="9" x2="21" y2="9"></line>
        <line x1="9" y1="21" x2="9" y2="9"></line>
    </svg>
);

const HelpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#858596" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-help-circle">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
);


const DashboardHomePage = () => {
    const [modules, setModules] = useState({});
    const [activeModule, setActiveModule] = useState(null);
    const currentUserEmail = localStorage.getItem('currentUserEmail');

    useEffect(() => {
        if (!currentUserEmail) {
            console.error("No current user email found in localStorage. Redirecting to login.");
            window.location.href = 'student-login.html';
            return;
        }

        const fetchModules = async () => {
            await openDB();
            const allFiles = await getAllFilesByEmail(currentUserEmail);
            const groupedModules = {};
            allFiles.forEach(file => {
                if (!groupedModules[file.moduleName]) {
                    groupedModules[file.moduleName] = { name: file.moduleName, files: [] };
                }
                groupedModules[file.moduleName].files.push(file);
            });
            setModules(groupedModules);

            const newlyCreatedModuleName = localStorage.getItem('newlyCreatedModuleName');
            if (newlyCreatedModuleName && groupedModules[newlyCreatedModuleName]) {
                setActiveModule(newlyCreatedModuleName);
                localStorage.removeItem('newlyCreatedModuleName');
            } else if (Object.keys(groupedModules).length > 0) {
                setActiveModule(Object.keys(groupedModules)[0]); // Select first module if no new one
            }
        };
        fetchModules();
    }, [currentUserEmail]);

    const handleAddModule = () => {
        window.location.href = 'student-create-module.html';
    };

    const handleLearningModeClick = (mode) => {
        console.log(`${mode} selected`);
        // Further logic for each learning mode would go here
    };

    return (
        <div className="flex min-h-screen bg-[#1B1F29] text-gray-300">
            {/* Left Sidebar */}
            <aside className="w-[300px] bg-white p-6 flex flex-col items-center shadow-xl z-30">
                <h2 className="text-lg font-semibold text-[#1b1b1f] mb-6 w-full text-left">My Modules</h2>
                <button 
                    onClick={handleAddModule}
                    className="flex items-center justify-center w-full h-[45px] px-4 mb-5 bg-[#8CC8FF] text-white rounded-[13px] text-base font-medium shadow-lg transition-all duration-200 ease-out hover:bg-[#79b7eb] hover:translate-y-[-2px] hover:shadow-xl"
                >
                    <AddIcon />
                    <span>Add Module</span>
                </button>
                <ul className="w-full flex-grow overflow-y-auto custom-scrollbar">
                    {Object.keys(modules).length === 0 ? (
                        <p className="text-center text-gray-400 p-5">No modules created yet.</p>
                    ) : (
                        Object.keys(modules).map((moduleName) => (
                            <li 
                                key={moduleName} 
                                className={`flex flex-col items-start p-4 mb-3 bg-white rounded-xl shadow-md cursor-pointer transition-all duration-180 ease-out 
                                    ${activeModule === moduleName ? 'bg-[#61afef] text-white shadow-lg translate-y-[-1px]' : 'hover:translate-y-[-3px] hover:shadow-lg'}
                                `}
                                onClick={() => setActiveModule(moduleName)}
                            >
                                <div className="flex items-center w-full">
                                    <ModuleIcon className={`${activeModule === moduleName ? 'filter invert' : 'filter brightness-0 invert-0.5'}`} />
                                    <span className={`font-semibold text-sm mb-1 ${activeModule === moduleName ? 'text-white' : 'text-[#1b1b1f]'}`}>{moduleName}</span>
                                </div>
                                {modules[moduleName].files.map(file => (
                                    <span key={file.id} className={`text-xs ${activeModule === moduleName ? 'text-gray-200' : 'text-[#858596]'}`}>{file.fileName}</span>
                                ))}
                            </li>
                        ))
                    )}
                </ul>
            </aside>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center justify-start px-10 pt-24 relative">
                {/* Container A */}
                <div className="w-4/5 max-w-[900px] h-[350px] bg-gradient-to-br from-[#232734] to-[#1C1F28] rounded-3xl shadow-lg inner-shadow z-20 flex items-center justify-center p-10 relative opacity-0 animate-fadeInSlideUp">
                    <div className="text-center">
                        <h1 className="text-5xl font-extrabold text-white opacity-90 mb-4">AI Classroom Tools</h1>
                        <p className="text-gray-300 text-lg">Your learning tools in one smart place.</p>
                    </div>
                </div>

                {/* Container B */}
                <div className="w-[85%] max-w-[1000px] bg-[#1F232E] py-10 rounded-[30px] shadow-xl relative -mt-10 z-10 flex justify-center gap-10 opacity-0 animate-fadeInSlideUpAnimationDelay">
                    <div 
                        onClick={() => handleLearningModeClick('AI Chatbot')}
                        className="w-[240px] h-[200px] bg-white rounded-2xl shadow-md flex flex-col items-center justify-center p-5 cursor-pointer transform transition-all duration-200 ease-out hover:scale-[1.05] hover:shadow-lg opacity-0 animate-fadeInSlideUp animation-delay-120ms"
                    >
                        <AIChatIcon />
                        <span className="text-[#858596] text-sm font-medium mt-3">AI Chatbot</span>
                    </div>
                    <div 
                        onClick={() => handleLearningModeClick('Exercises')}
                        className="w-[240px] h-[200px] bg-white rounded-2xl shadow-md flex flex-col items-center justify-center p-5 cursor-pointer transform transition-all duration-200 ease-out hover:scale-[1.05] hover:shadow-lg opacity-0 animate-fadeInSlideUp animation-delay-240ms"
                    >
                        <ExercisesIcon />
                        <span className="text-[#858596] text-sm font-medium mt-3">Exercises</span>
                    </div>
                    <div 
                        onClick={() => handleLearningModeClick('Lesson Schematiser')}
                        className="w-[240px] h-[200px] bg-white rounded-2xl shadow-md flex flex-col items-center justify-center p-5 cursor-pointer transform transition-all duration-200 ease-out hover:scale-[1.05] hover:shadow-lg opacity-0 animate-fadeInSlideUp animation-delay-360ms"
                    >
                        <LessonSchematiserIcon />
                        <span className="text-[#858596] text-sm font-medium mt-3">Lesson Schematiser</span>
                    </div>
                </div>
            </main>

            {/* Help Icon */}
            <div className="absolute bottom-8 right-8 w-10 h-10 bg-gray-700 bg-opacity-30 rounded-full flex items-center justify-center cursor-pointer shadow-lg animate-pulse hover:scale-[1.1] hover:shadow-xl transition-all duration-200 ease-out hidden-onload">
                <HelpIcon />
            </div>
        </div>
    );
};

export default DashboardHomePage;
