import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import logo from '../../../public/images/logo.png'
import { FaDiscord, FaGithub } from 'react-icons/fa'
import { CgFileDocument } from 'react-icons/cg'
import HamburgerMenu from 'react-hamburger-menu'

function Navbar() {

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const handleClick = e => {
    const index = parseInt(e.target.id, 0);
    if (index !== active) {
      setActive(index);
    }
  };
  return (
    <Nav>
      <Logo src={logo} />
      <HamburgerMenu
        isOpen={open}
        menuClicked={() => setOpen(!open)}
        width={24}
        height={18}
        strokeWidth={2}
        rotate={0}
        color='#fff'
        borderRadius={0}
        animationDuration={0.5}
      />
      <NavMenu open={open}>
        <Li onClick={handleClick} active={active === 0} id={0}>Home</Li>
        <Li onClick={handleClick} active={active === 1} id={1}>NFT Minting dApp</Li>
        <Li onClick={handleClick} active={active === 2} id={2}>YTX Card Game</Li>
        <Li><FaDiscord size={27} color={"#a7a7a7"} /></Li>
        <Li><FaGithub size={27} color={"#a7a7a7"} /></Li>
        <Li><CgFileDocument size={27} color={"#a7a7a7"} /></Li>
        <Li><a href="#!">Connect Wallet</a></Li>
      </NavMenu>
    </Nav>
  )
}

const Nav = styled.div`
  height: 64px;
  width: 100%;
  padding: 0 30px;
  background: #1f1f1f;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  div {
    display: none;
  }
  @media(max-width:891px){
    div {
      display: block;
    }
  }

`

const Logo = styled.img`
  height: 50px;
  width: 50px;
`
const NavMenu = styled.ul`
  display: flex;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0 20px;
  @media(max-width: 891px){
    display: none;
  ${({ open }) => open && css`
    display: flex;
    position: absolute;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    background-color: #1f1f1f;
    border: 1px solid rgb(105, 102, 102);

    top: 64px;
    right: 0;
    height: 40vh;
    width: 300px;
    z-index: 5;
  `}
  }
`

const Li = styled.li`
  list-style: none;
  line-height: 64px;
  padding: 0 16px;
  letter-spacing: 1px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  &:not(:last-child){
    display: flex;
    justify-content: center;
    align-items: center;
  }
  &:nth-child(4){
    margin-left: auto;
    @media(max-width: 891px){
      margin-left: 0;
    }
  }
  &:last-child a{
    border: 1px solid #ff8a32;
    padding: 8px 16px;
    text-decoration: none;
    border-radius: 0.3rem;
    color: #fff;
  }
  @media(max-width: 891px){
    &:nth-child(-n+3){
      display: flex;
      justify-content: center;
      align-items: center;
      /* border: 1px solid red; */
      line-height: 0;
      padding: 20px 15px;
    }
    
    &:not(:last-child):hover{
      border-bottom: 2px solid #ff8a32;
    }
  }
  ${({ active }) => active && css`
    font-weight: 900;
    font-size:16px;
  `}
`

export default Navbar
