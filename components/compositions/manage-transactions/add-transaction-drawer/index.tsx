'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useMediaQuery } from 'usehooks-ts';
import { useTransactionDrawerContext } from './drawer-context';
import { TransactionFormTab } from './transaction-form-tab';

export const AddTransactionDrawer = () => {
  const { open, setOpen } = useTransactionDrawerContext();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="px-6 text-lg">
            Add
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Add transaction</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <TransactionFormTab
            footer={
              <DialogFooter>
                <LocalButton />
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            }
          ></TransactionFormTab>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} autoFocus={open}>
      <DrawerTrigger asChild>
        <Button variant="default" className="w-full text-lg" inert={open}>
          Add
        </Button>
      </DrawerTrigger>
      <DrawerContent className="">
        <DrawerHeader className="text-left">
          <DrawerTitle>Add transaction</DrawerTitle>
          <DrawerDescription></DrawerDescription>
        </DrawerHeader>
        <TransactionFormTab
          footer={
            <DrawerFooter className="px-0">
              <LocalButton />
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          }
        ></TransactionFormTab>
      </DrawerContent>
    </Drawer>
  );
};

const LocalButton = () => (
  <Button type="submit" variant="default" disableOnProcess>
    Save
  </Button>
);
