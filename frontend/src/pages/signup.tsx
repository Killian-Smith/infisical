/* eslint-disable no-nested-ternary */
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

import CodeInputStep from '@app/components/signup/CodeInputStep';
import DownloadBackupPDF from '@app/components/signup/DonwloadBackupPDFStep';
import EnterEmailStep from '@app/components/signup/EnterEmailStep';
import InitialSignupStep from '@app/components/signup/InitialSignupStep';
import TeamInviteStep from '@app/components/signup/TeamInviteStep';
import UserInfoStep from '@app/components/signup/UserInfoStep';
import SecurityClient from '@app/components/utilities/SecurityClient';
import { getTranslatedStaticProps } from '@app/components/utilities/withTranslateProps';
import { useFetchServerStatus } from '@app/hooks/api/serverDetails';
import { useProviderAuth } from '@app/hooks/useProviderAuth';

import checkEmailVerificationCode from './api/auth/CheckEmailVerificationCode';
import getWorkspaces from './api/workspace/getWorkspaces';

/**
 * @returns the signup page
 */
export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('123456');
  const [codeError, setCodeError] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { data: serverDetails } = useFetchServerStatus();
  const [isSignupWithEmail, setIsSignupWithEmail] = useState(false);
  const { t } = useTranslation();
  const {
    email: providerEmail,
    providerAuthToken,
    isProviderUserCompleted,
  } = useProviderAuth();

  if (providerAuthToken && isProviderUserCompleted) {
    router.push('/login');
  }

  if (providerAuthToken && step < 3) {
    setStep(3);
  }

  useEffect(() => {
    const tryAuth = async () => {
      try {
        const userWorkspaces = await getWorkspaces();
        router.push(`/dashboard/${userWorkspaces[0]._id}`);
      } catch (error) {
        console.log('Error - Not logged in yet');
      }
    };
    tryAuth();
  }, []);

  /**
   * Goes to the following step (out of 5) of the signup process.
   * Step 1 is submitting your email
   * Step 2 is Verifying your email with the code that you received
   * Step 3 is asking the final info.
   * Step 4 is downloading a backup pdf
   * Step 5 is inviting users
   */
  const incrementStep = async () => {
    if (step === 1 || step === 3 || step === 4) {
      setStep(step + 1);
    } else if (step === 2) {
      // Checking if the code matches the email.
      const response = await checkEmailVerificationCode({ email, code });
      if (response.status === 200) {
        const { token } = await response.json();
        SecurityClient.setSignupToken(token);
        setStep(3);
      } else {
        setCodeError(true);
      }
    }
  };

  // when email service is not configured, skip step 2 and 5
  useEffect(() => {
    if (!serverDetails?.emailConfigured && step === 2) {
      incrementStep()
    }

    if (!serverDetails?.emailConfigured && step === 5) {
      getWorkspaces().then((userWorkspaces) => {
        router.push(`/dashboard/${userWorkspaces[0]._id}`);
      });
    }
  }, [step]);

  const renderView = (registerStep: number) => {
    if (isSignupWithEmail && registerStep === 1) {
      return <EnterEmailStep email={email} setEmail={setEmail} incrementStep={incrementStep} />
    }

    if (!isSignupWithEmail && registerStep === 1) {
      return <InitialSignupStep setIsSignupWithEmail={setIsSignupWithEmail} />
    }

    if (registerStep === 2) {
      return (
        <CodeInputStep
          email={email}
          incrementStep={incrementStep}
          setCode={setCode}
          codeError={codeError}
        />
      )
    }

    if (registerStep === 3) {
      return (
        <UserInfoStep
          incrementStep={incrementStep}
          email={email || providerEmail}
          password={password}
          setPassword={setPassword}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          providerAuthToken={providerAuthToken}
        />
      )
    }

    if (registerStep === 4) {
      return (
        <DownloadBackupPDF
          incrementStep={incrementStep}
          email={email || providerEmail}
          password={password}
          name={`${firstName} ${lastName}`}
        />
      )
    }

    if (serverDetails?.emailConfigured) {
      return <TeamInviteStep />
    }

    return ""
  }

  return (
    <div className="bg-gradient-to-tr from-bunker-600 to-bunker-800 min-h-screen flex flex-col justify-center pb-28 px-6 ">
      <Head>
        <title>{t('common:head-title', { title: t('signup:title') })}</title>
        <link rel="icon" href="/infisical.ico" />
        <meta property="og:image" content="/images/message.png" />
        <meta property="og:title" content={t('signup:og-title') as string} />
        <meta name="og:description" content={t('signup:og-description') as string} />
      </Head>
      <div className="flex justify-center mb-8 mt-20">
        <Image src="/images/gradientLogo.svg" height={90} width={120} alt="Infisical Logo" />
      </div>
      <form onSubmit={(e) => e.preventDefault()}>
        {renderView(step)}
      </form>
    </div>
  );
}

export const getStaticProps = getTranslatedStaticProps(['auth', 'signup', 'section-password']);
